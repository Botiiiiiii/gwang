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
    for (let index = 0; index < row.length; index++) {
        let date = row[index].deliver_day;
        let year = date.substr(0,4);
        let month = date.substr(4,2);
        let day = date.substr(6,2);
        let time = row[index].deliver_time;
        let hour = time.substr(0,2);
        let min = time.substr(2,2);
        let sec = time.substr(4,2);
        row[index].deliver_day = year + "-" + month + "-" + day;
        row[index].deliver_time = hour + ":" + min + ":" + sec;
    }

    return row;
}

con.connect(function(err){
    if (err) throw err;
    console.log('Connected');
});

router.post('/money', authMiddleware, async function(req, res, next) {
    try{
        var id = req.tokenInfo.id;
        var today = new Date();
        var year = today.getFullYear();
        var month = ('0' + (today.getMonth() + 1)).slice(-2);
        var day = ('0' + today.getDate()).slice(-2);
        var hours = ('0' + today.getHours()).slice(-2); 
        var minutes = ('0' + today.getMinutes()).slice(-2);
        var seconds = ('0' + today.getSeconds()).slice(-2);
        var monthString = year + month;
        var timeString = hours + minutes + seconds;
        var max_month;
        var min_month;
        const [rows] = await con.promise().query('SELECT * from user.post_info where id = ? and deliver_day like ?;',[id,monthString+'%']);
        for (let index = 0; index < rows.length; index++) {
            const element = rows[index].deliver_day;
            if (index == 1) {
                max_month = element;
                min_month = element;
            }
            else if (max_month < element) {
                max_month = element;
            }
            else if (min_month > element) {
                min_month = element;
            }
        }



        result = {
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
    };
    res.send(result)
});

router.post('/complete', authMiddleware, async function(req, res, next){
    try{
        var barcode = req.body.barcode;
        const [check_rows] = await con.promise().query('SELECT expect_date, expect_time from post_info where barcode = ?;',[barcode]);
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
        if (check_rows[0].expect_date >= dateString) {
            if(check_rows[0].expect_time >= timeString){
                status = 'CR';
            }
            else{
                status = 'CL';
            }
        }

        var url = await upload(req);

        const [rows] = await con.promise().query('UPDATE post_info SET post_img = ?, post_status = ?, deliver_day = ?, deliver_time = ? WHERE barcode = ?;', [url.Location, status, dateString, timeString, barcode]);

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

router.post('/list', authMiddleware, async function(req, res, next){
    try{
        const id = req.tokenInfo.id
        var [wait_rows] = await con.promise().query('select barcode, reciever_address, category, destination from post_info where id = ? and post_status = \'wating\';',[id]);
        var [ing_rows] = await con.promise().query('select barcode, reciever_address, category, destination from post_info where id = ? and post_status = \'ING\';',[id]);
        var [c_rows] = await con.promise().query('select post_img, post_info.barcode, post_info.reciever_address, post_info.category, post_info.destination, deliver_day, deliver_time from post_info where post_info.id = ? and \(post_info.post_status = \'CR\' or post_info.post_status = \'CL\' \);',[id]);
        var [e_rows] = await con.promise().query('select barcode, reciever_address, category, destination from post_info where id = ? and \(post_info.post_status = \'W\' or post_info.post_status = \'D\' or post_info.post_status = \'B\' \);',[id]);
        
        wait_rows = changedatetime(wait_rows);
        ing_rows = changedatetime(ing_rows);
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

        const [rows] = await con.promise.query('UPDATE user_info SET perfer_time = ?, perfer_count = ?, zone = ? where id = ?;',[prefer_time, prefer_count, zone, id]);

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

router.post('/task_assign', authMiddleware, async function(req, res, next){
    try{
        const id = req.tokenInfo.id;
        const [user_row] = await con.promise().query('select * from user_info where id = ?',[id]);
        const prefer_count = user_row[0].prefer_count;
        const prefer_time = user_row[0].prefer_time;
        const [rows] = await con.promise().query('select barcode from post_info where post_status = \'N\' and post_time = ? ',[prefer_time]);

        for (let index = 0; index < rows.length; index++) {
            const element = rows[index];
            
        }


        while(1){ 
            var group = Math.floor((Math.random() * 88888) + 1);
            var resu = await con.promise().query('SELECT EXISTS (SELECT group_id FROM group_info where group_id = ?) as success',[group]);
            if(!resu[0][0].success){
                break;
            }
        }

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

router.post('/error', authMiddleware, async function(req, res, next){
    try{
        // const id = req.tokenInfo.id
        const barcode = req.body.barcode;
        const err_code = req.body.err_code;
        
        var today = new Date();
        var year = today.getFullYear();
        var month = ('0' + (today.getMonth() + 1)).slice(-2);
        var day = ('0' + today.getDate()).slice(-2);
        var hours = ('0' + today.getHours()).slice(-2); 
        var minutes = ('0' + today.getMinutes()).slice(-2);
        var seconds = ('0' + today.getSeconds()).slice(-2);
        var dateString = year + month + day;
        var timeString = hours + minutes + seconds;

        if (err_code == 'E') {
            const err_reason = req.body.err_reason;
            const [rows] = await con.promise().query('UPDATE post_info SET post_status = ?, error_reason = ?, deliver_day = ?, deliver_time = ? WHERE barcode = ?;', [err_code, err_reason, dateString, timeString, barcode]);
        }
        else {
            const [rows] = await con.promise().query('UPDATE post_info SET post_status = ?, deliver_day = ?, deliver_time = ? WHERE barcode = ?;', [err_code, dateString, timeString, barcode]);
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