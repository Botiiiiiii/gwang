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
        let time = row[index].expect_time;
        let hour = time.toString().substr(0,2);
        let min = time.toString().substr(2,2);
        let sec = time.toString().substr(4,2);
        row[index].expect_time = hour + ":" + min + ":" + sec;
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
        const [rows] = await con.promise().query('select sum(post_cost) as cost from post_info where id = ? and pay_status = \'N\';',[id]);
        

        var [task_info] = await con.promise().query('select post_info.del_id, post_info.post_type, post_info.category, post_info.post_time, post_info.sender_address, post_info.receiver_address, post_info.expect_date, post_info.expect_time, post_info.zone, terminal_list.terminal_name from post_info inner join terminal_list on post_info.terminal_id = terminal_list.terminal_id where post_info.id = ? and (post_status = \'wating\' or post_status = \'ING\'); ',[id]);
        var task_list = task_info;
        task_list = changedatetime(task_list);
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