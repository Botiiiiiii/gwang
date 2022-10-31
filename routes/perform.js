const express = require('express');
const router = express.Router();
const authMiddleware = require('./authmiddleware');


const mysql = require('mysql2');
const jwt = require("jsonwebtoken");
const { route } = require('./main');
const { DataSync } = require('aws-sdk');
const algorithm = process.env.JWT_ALG;
const expiresIn = process.env.JWT_Expire;
const jwt_option = {algorithm, expiresIn,};

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

function get_last_date(month, year){

    // 달력 연도
    var calendarYear = year;
    // 달력 월
    var calendarMonth = month-1;
    
    const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    // 윤년 계산
    if (calendarYear % 400 == 0) {
        monthDays[1] = 29;
    } else if (calendarYear % 100 == 0) {
        monthDays[1] = 28;
    } else if (calendarYear % 4 == 0) {
        monthDays[1] = 29;
    }

    // 달력 월의 마지막 일
    var calendarMonthLastDate = monthDays[month-1];
    
    return calendarMonthLastDate;
}

router.post('/', authMiddleware, async function(req, res, next){
    try{
        var id = req.tokenInfo.id;
        var month = req.body.month;
        var year = req.body.year;
        var complete = 0;
        var wrong = 0;
        var miss = 0;
        var month_cost = 0;
        const last_date = get_last_date(month);
        month = String(month).padStart(2,'0');
        const [rows] = await con.promise().query('select sum(post_cost) as cost from post_info where id = ? and pay_status = \'N\' and post_status not in (\'waiting\',\'ING\');',[id]);
        const plan_cost = rows[0].cost;
        const [month_rows] = await con.promise().query('select * from post_info where id = ? and expect_date like ?;',[id,year+month+'%']);
        

        for (let index = 0; index < month_rows.length; index++) {
            const element = month_rows[index];
            
            if (element.post_status == 'waiting'){
                continue;
            }
            else if (element.post_status == 'ING'){
                continue;
            }
            else if (element.post_status == 'CR'){
                complete ++;
            }
            else if (element.post_status == 'M'){
                miss ++;
            }
            else {
                wrong ++;
            }
            if (element.pay_status == 'N'){
                month_cost += element.post_cost;
            }
        }

        const complete_rate = parseInt(complete / month_rows.length * 100);
        const wrong_rate = parseInt(wrong / month_rows.length * 100);
        const miss_rate = parseInt(miss / month_rows.length * 100);

        var year_month = year+'-'+month+'-';
        const date = new Date(year_month+'01');
        const start_day = date.getDay();
        const week_data = new Array();
        var date_day = 1;

        

        while (date_day <= last_date){
            var startDate = year_month+String(date_day).padStart(2,'0');
            var sql_start = date_day;
            
            if (date_day + 6 > last_date){
                date_day = last_date;
            } 
            else if (date_day == 1) {
                date_day += 7-start_day;
            }
            else {
                date_day += 6;
            }

            var endDate = year_month+date_day;

            var start_sql_date = year+month+String(sql_start).padStart(2,'0');
            var end_sql_date = year+month+String(date_day).padStart(2,'0');
            
            const [price_rows] = await con.promise().query('select sum(post_cost) as price from post_info where id = ? and (deliver_day >= ? and deliver_day <= ?);',[id,start_sql_date,end_sql_date]);
            var price = price_rows[0].price;
            var data_tmp = {
                "startDate" : startDate,
                "endDate" : endDate,
                "price" : price,
            }

            week_data.push(data_tmp);
            date_day ++;
        }

        var result = {
            "code" : 200,
            "data" : {
                message: 'true',
                cost : plan_cost,
                month_cost: month_cost,
                complete_rate: complete_rate,
                wrong_rate: wrong_rate,
                miss_rate: miss_rate,
                week_data: week_data
            }
        }
    }
    catch(e){
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