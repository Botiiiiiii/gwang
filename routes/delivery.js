const express = require('express');
const { JsonWebTokenError } = require('jsonwebtoken');
const router = express.Router();
const authMiddleware = require('./authmiddleware');
const { upload } = require('./s3miiddleware')
var path = require('path');
require('dotenv').config();
var fs = require('fs');

const mysql = require('mysql2');
const jwt = require("jsonwebtoken");
const algorithm = process.env.JWT_ALG;
const expiresIn = process.env.JWT_Expire;
const jwt_option = {algorithm, expiresIn,}

const con = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PW,
    database: process.env.DB_db,
});

function changedatetime(row){
    if (row.length === 0){
        return row;
    }
    else{
        for (let index = 0; index < row.length; index++) {
            let date = row[index].deliver_day;
            let year = date.toString().substr(0,4);
            let month = date.toString().substr(4,2);
            let day = date.toString().substr(6,2);
            let time = row[index].deliver_time;
            let hour = time.toString().substr(0,2);
            let min = time.toString().substr(2,2);
            let sec = time.toString().substr(4,2);
            row[index].deliver_day = year + "-" + month + "-" + day;
            row[index].deliver_time = hour + ":" + min + ":" + sec;
        }

        return row;
    }
}

function changedatetime_expect(rows){
    if (rows.length === 0){
        return rows;
    }
    else{
        for (let index = 0; index < rows.length; index++) {
            let date = rows[index].expect_date;
            let year = date.toString().substr(0,4);
            let month = date.toString().substr(4,2);
            let day = date.toString().substr(6,2);
            let time = rows[index].expect_time;
            let hour = time.toString().substr(0,2);
            let min = time.toString().substr(2,2);
            let sec = time.toString().substr(4,2);
            rows[index].expect_date = year + "-" + month + "-" + day;
            rows[index].expect_time = hour + ":" + min + ":" + sec;
        }

        return rows;
    }
}

con.connect(function(err){
    if (err) throw err;
    console.log('Connected');
});


router.post('/complete', authMiddleware, async function(req, res, next){
    try{
        var del_id = req.body.del_id;
        var id = req.tokenInfo.id;
        const [check_rows] = await con.promise().query('SELECT expect_date, expect_time from post_info where del_id = ?;',[del_id]);
        const [user_row] = await con.promise().query('SELECT * from user_info where id = ?;',[id]);
        var status;
        var today = new Date();

        var year = today.getFullYear();
        var month = ('0' + (today.getMonth() + 1)).slice(-2);
        var day = ('0' + today.getDate()).slice(-2);
        var hours = ('0' + today.getHours()).slice(-2); 
        var minutes = ('0' + today.getMinutes()).slice(-2);
        var seconds = ('0' + today.getSeconds()).slice(-2);
        var dateString = year + month + day;
        var timeString = hours + minutes + seconds;
        
        const [count_row] = await con.promise().query('UPDATE user_info SET post_count = ?;',[user_row[0].post_count+1])
        if (check_rows[0].expect_date >= dateString) {
            if(check_rows[0].expect_time >= timeString){
                status = 'CR';
                const [cr_row] = await con.promise().query('UPDATE user_info SET post_complete = ?, post_right = ?;',[user_row[0].post_complete+1, user_row[0].post_right+1])
            }
            else{
                status = 'CL';
            }
        }
        else {
            status = 'CL';
        }

        var url = await upload(req);

        const [rows] = await con.promise().query('UPDATE post_info SET post_img = ?, post_status = ?, deliver_day = ?, deliver_time = ? WHERE del_id = ?;', [url.Location, status, dateString, timeString, del_id]);

        var result = {
            "code" : 200,
            "data" : {
                message: 'true',
                url: url.Location
            }
        }
    }
    catch(e){
        console.log(e);
        var result = {
            "code" : 500,
            "data" : {
                message: 'false',
                err: e.code
            }
        }
    }   
    res.send(result);
});

router.post('/task_list', authMiddleware, async function(req, res, next){ 
    try{
        const id = req.tokenInfo.id;
        var [rows] = await con.promise().query('select post_info.del_id, post_info.post_type, post_info.post_status as category, post_info.post_time, post_info.sender_address, post_info.receiver_address, post_info.expect_date, post_info.expect_time, post_info.zone, terminal_list.terminal_name from post_info inner join terminal_list on post_info.terminal_id = terminal_list.terminal_id where post_info.id = ? and post_status IN (\'wating\',\'ING\'); ',[id]);
        var [done_rows] = await con.promise().query('select post_info.del_id, post_info.post_type, post_info.category, post_info.post_time, post_info.sender_address, post_info.receiver_address, post_info.deliver_day as expect_date, post_info.deliver_time as expect_time, post_info.post_status, post_info.zone, terminal_list.terminal_name from post_info inner join terminal_list on post_info.terminal_id = terminal_list.terminal_id where post_info.id = ? and post_status not in (\'wating\',\'ING\'); ',[id]);
        if (rows.length > 0){
            rows = changedatetime_expect(rows);
        }

        if(done_rows.length>0){
            done_rows = changedatetime_expect(done_rows);
        }

        var result = {
            "code" : 200,
            "data" : {
                message: 'true',
                task_list: rows,
                done_list: done_rows
            }
        }
    }
    catch(e){
        console.log(e);
        var result = {
            "code" : 500,
            "data" : {
                message: 'false',
                err: e.code
            }
        }
    }
    res.send(result);
});

router.post('/del_list', authMiddleware, async function(req, res, next){
    try{
        const id = req.tokenInfo.id
        var [wait_rows] = await con.promise().query('select post_info.del_id, post_info.post_type, post_info.sender_address, post_info.receiver_address, post_info.category, post_info.destination, terminal_list.terminal_address from post_info inner join terminal_list on terminal_list.terminal_id = post_info.terminal_id where id = ? and post_status = \'wating\';',[id]);
        var [ing_rows] = await con.promise().query('select post_info.del_id, post_info.post_type, post_info.sender_address, post_info.receiver_address, post_info.category, post_info.destination, terminal_list.terminal_address from post_info inner join terminal_list on terminal_list.terminal_id = post_info.terminal_id where id = ? and post_status = \'ING\';',[id]);
        var [c_rows] = await con.promise().query('select post_info.del_id, post_img, post_type, post_info.sender_address, post_info.receiver_address, post_info.category, post_info.destination, post_info.deliver_day, post_info.deliver_time, terminal_list.terminal_address from post_info inner join terminal_list on terminal_list.terminal_id = post_info.terminal_id where post_info.id = ? and \(post_info.post_status = \'CR\' or post_info.post_status = \'CL\' \);',[id]);
        var [e_rows] = await con.promise().query('select post_info.del_id, post_info.post_type, post_info.post_status, post_info.sender_address, post_info.receiver_address, post_info.category, post_info.destination, terminal_list.terminal_address, post_info.deliver_day, post_info.deliver_time from post_info inner join terminal_list on terminal_list.terminal_id = post_info.terminal_id where id = ? and \(post_info.post_status = \'W\' or post_info.post_status = \'D\' or post_info.post_status = \'B\' or post_info.post_status = \'E\' or post_info.post_status = \'M\'\);',[id]);
        
        c_rows = changedatetime(c_rows);
        e_rows = changedatetime(e_rows);

        var result = {
            "code" : 200,
            "data" : {
                message: 'true',
                wait_list: wait_rows,
                ing_list: ing_rows,
                complete_list: c_rows,
                error_list: e_rows
            }
        }
    }
    catch(e){
        console.log(e);
        var result = {
            "code" : 500,
            "data" : {
                message: 'false',
                err: e.code
            }
        }
    }
    res.send(result);
});

router.post('/update_info', authMiddleware, async function(req, res, next){
    try{
        const id = req.tokenInfo.id
        const prefer_time = req.body.prefer_time;
        const prefer_count = req.body.prefer_count;
        const zone = req.body.zone;

        const [rows] = await con.promise().query('UPDATE user_info SET prefer_time = ?, prefer_count = ?, zone = ? where id = ?;',[prefer_time, prefer_count, zone, id]);

        var result = {
            "code" : 200,
            "data" : {
                message: 'true',
            }
        }
    }
    catch(e){
        console.log(e);
        var result = {
            "code" : 500,
            "data" : {
                message: 'false',
                err: e.code
            }
        }
    }
    res.send(result);
});

router.post('/task_assign', authMiddleware, async function(req, res, next){ // task list 보여주기 수량에 맞게
    try{
        const id = req.tokenInfo.id;
        const [user_row] = await con.promise().query('select * from user_info where id = ?;',[id]);
        const zone = user_row[0].zone;
        const prefer_count = user_row[0].prefer_count;
        const prefer_time = user_row[0].prefer_time;
        const [rows] = await con.promise().query('select post_info.del_id, post_info.post_type, post_info.expect_time, post_info.expect_date, post_info.sender_address, post_info.receiver_address, post_info.category, terminal_list.terminal_name, post_info.post_time from post_info inner join terminal_list on post_info.terminal_id = terminal_list.terminal_id where post_info.post_status = \'N\' and post_info.post_time = ? and post_info.zone = ? order by expect_time limit ?;',[prefer_time, zone, prefer_count]);

        if (rows.length > 0){
            for (let index = 0; index < rows.length; index++) {
                let date = rows[index].expect_date;
                let year = date.toString().substr(0,4);
                let month = date.toString().substr(4,2);
                let day = date.toString().substr(6,2);
                let time = rows[index].expect_time;
                let hour = time.toString().substr(0,2);
                let min = time.toString().substr(2,2);
                let sec = time.toString().substr(4,2);
                rows[index].expect_date = year + "-" + month + "-" + day;
                rows[index].expect_time = hour + ":" + min + ":" + sec;
            }
        }
        var result = {
            "code" : 200,
            "data" : {
                message: 'true',
                del_id: rows
            }
        }
    }
    catch(e){
        console.log(e);
        var result = {
            "code" : 500,
            "data" : {
                message: 'false',
                err: e.code
            }
        }
    }
    res.send(result);
});

router.post('/task_put', authMiddleware, async function(req,res,next){ // task 확정 및 신청
    try{
        const del_id_list = req.body.del_id_list;
        const id = req.tokenInfo.id;
        var check = 0;
        for (let index = 0; index < del_id_list.length; index++) {
            const element = del_id_list[index];
            console.log(element);
            let [row] = await con.promise().query('SELECT post_status from post_info where del_id = ?;',[element]);
            if(row[0].post_status != 'N'){
                check++;
            }
        }
        if(check > 0){
            var result ={
                "code" : 200,
                "data" : {
                    message: 'again'
                }
            }
        }
        else{
            for (let index = 0; index < del_id_list.length; index++) {
                const element = del_id_list[index];
                let [row] = await con.promise().query('UPDATE post_info SET post_status = \'wating\', id = ? where del_id = ?;',[id, element]);
            }
            var result = {
                "code" : 200,
                "data" : {
                    message: 'true'
                }
            }
        }
    }
    catch(e){
        console.log(e);
        var result ={
            "code" : 500,
            "data" : {
                message: 'false',
                err: e.code
            }
        }
    }
    res.send(result);
});

router.post('/task_ing', authMiddleware, async function(req, res, next){
    try{
        var id = req.tokenInfo.id;
        var del_id = req.body.del_id;
        let [row] = await con.promise().query('UPDATE post_info SET post_status = \'ING\' where del_id = ? and id = ?;',[del_id, id]);
        var result = {
            "code" : 200,
            "data" : {
                message: 'true'
            }
        }
    }
    catch(e){
        console.log(e);
        var result = {
            "code" : 500,
            "data" : {
                message: 'false',
                err: e.code
            }
        }
    }
    res.send(result);
});


router.post('/error', authMiddleware, async function(req, res, next){
    try{
        const id = req.tokenInfo.id
        const del_id = req.body.del_id;
        const err_code = req.body.err_code;
        
        const [user_row] = await con.promise().query('select * from user_info where id = ?;',[id]);

        var today = new Date();
        var year = today.getFullYear();
        var month = ('0' + (today.getMonth() + 1)).slice(-2);
        var day = ('0' + today.getDate()).slice(-2);
        var hours = ('0' + today.getHours()).slice(-2); 
        var minutes = ('0' + today.getMinutes()).slice(-2);
        var seconds = ('0' + today.getSeconds()).slice(-2);
        var dateString = year + month + day;
        var timeString = hours + minutes + seconds;

        const [count_row] = await con.promise().query('UPDATE user_info SET post_count = ?;',[user_row[0].post_count+1])

        if (err_code == 'E') {z
            const err_reason = req.body.err_reason;
            const [rows] = await con.promise().query('UPDATE post_info SET post_status = ?, error_reason = ?, deliver_day = ?, deliver_time = ? WHERE del_id = ?;', [err_code, err_reason, dateString, timeString, del_id]);
        }
        else {
            const [rows] = await con.promise().query('UPDATE post_info SET post_status = ?, deliver_day = ?, deliver_time = ? WHERE del_id = ?;', [err_code, dateString, timeString, del_id]);
        }
        
        if (err_code == 'M'){
            const [e_row] = await con.promise().query('UPDATE user_info SET post_miss = ?;',[user_row[0].post_miss+1])
        }
        else {
            const [e_row] = await con.promise().query('UPDATE user_info SET post_wrong = ?;',[user_row[0].post_wrong+1])
        }
        
        var result = {
            "code" : 200,
            "data" : {
                message: 'true'
            }
        }
    }
    catch(e){
        console.log(e);
        var result = {
            "code" : 500,
            "data" : {
                message: 'false',
                err: e.code
            }
        }
    }
    res.send(result);
});

module.exports = router;