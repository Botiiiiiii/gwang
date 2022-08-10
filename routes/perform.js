const express = require('express');
const router = express.Router();
const authMiddleware = require('./authmiddleware');


const mysql = require('mysql2');
const jwt = require("jsonwebtoken");
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

router.post('/', authMiddleware, async function(req, res, next){
    try{
        var id = req.tokenInfo.id;
        var today = new Date();
        var year = today.getFullYear();
        var month = req.body.month;
        // var month = ('0' + (today.getMonth() + 1)).slice(-2);
        const [rows] = await con.promise().query('select sum(post_cost) as cost from post_history where id = ? and pay_status = \'N\';',[id]);
        const plan_cost = rows[0].cost;
        const [month_row] = await con.promise().query('select * from post_history where id = ?')
        
        var result = {
            "code" : 200,
            "data" : {
                message: 'true',
                plan_cost : cost,
                
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