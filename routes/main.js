const express = require('express');
const router = express.Router();
const authMiddleware = require('./authmiddleware');
const upload = require('./s3miiddleware');
var path = require('path');
require('dotenv').config();

const mysql = require('mysql2');

const con = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PW,
    database: process.env.DB_db,
});

con.connect(function(err){
    if (err) throw err;
    console.log('Connected');
});

function changedatetime(row){
    for (let index = 0; index < row.length; index++) {
        let date = row[index].expect_date;
        let year = date.toString().substr(0,4);
        let month = date.toString().substr(4,2);
        let day = date.toString().substr(6,2);
        row[index].expect_date = year + "-" + month + "-" + day;
    }

    return row;
}

router.post('/', authMiddleware, async function(req, res, next){
    try{
        const id = req.tokenInfo.id;
        var cost = 0;
        const [id_rows] = await con.promise().query('select * from user_info where id = ?;',[id]);
        const name = id_rows[0].name;
        const complete_rate = parseInt(id_rows[0].post_complete / id_rows[0].post_count * 100);
        const wrong_rate = parseInt(id_rows[0].post_wrong / id_rows[0].post_count * 100);
        const miss_rate = parseInt(id_rows[0].post_miss / id_rows[0].post_count * 100);
        const [rows] = await con.promise().query('select sum(post_cost) as cost from post_info where id = ? and pay_status = \'Y\';',[id]);
        // const [rows] = await con.promise().query('select * from post_info where id = ?;',[id]);
        // for (let index = 0; index < rows.length; index++) {
            //     if (rows[index].post_status == 'Y') {
            //         continue;
            //     }
            //     const element = rows[index].post_cost;
        //     cost += element;
        // } 
        
        // const [group_rows]  = await con.promise().query('select * from group_info where id = ? and group_status =\'N\';',[id]);
        // const group_id = group_rows[0].group_id;
        // const [task_info] = await con.promise().query('select post_info.barcode, post_info.expect_date, post_info.post_time, post_info.post_type, post_info.reciever_address, post_info.zone, terminal_list.terminal_name  from post_info cross join terminal_list on post_info.terminal_id = terminal_list.terminal_id where group_id = ?;',[group_id]);
        var [task_info] = await con.promise().query('select group_info.id, group_info.group_id, post_info.expect_date, post_info.post_time, post_info.zone, terminal_list.terminal_name from group_info inner join post_info on group_info.group_id = post_info.group_id inner join terminal_list on post_info.terminal_id = terminal_list.terminal_id where group_info.id = ? and group_info.group_status = \'N\' GROUP BY group_info.group_id;',[id]);
        console.log(task_info[0].expect_date);
        task_info = changedatetime(task_info);
        var task_list = task_info;
        var result = {
            "code" : 200,
            "data" : {
                message: 'true',
                name: name,
                cost: rows[0].cost,
                complete_rate: complete_rate,
                wrong_rate: wrong_rate,
                miss_rate: miss_rate,
                task_list: task_list
            }
        }
    }
    catch(e){
        console.log(e);
        var result = {
            "coe" : 500,
            "data" : {
                message: 'false',
                err: e.code
            }
        }
    }
    res.send(result);
});

module.exports = router;