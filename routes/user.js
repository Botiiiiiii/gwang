const express = require('express');
const { JsonWebTokenError } = require('jsonwebtoken');
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

router.patch

router.post('/login', async function(req, res, next) {
    var id;
    var pw;

    try{
        const [rows, fields] = await con.promise().query('SELECT * FROM user_info WHERE id = ?;',[req.body.id]);
        id = rows[0].id;
        pw = rows[0].pw;

        if(req.body.pw == pw){ // success login
            
            let accessToken = jwt.sign({id: id}, process.env.JWT_S_KEY,jwt_option);

            var result = {
                "code" : 200,
                "data" : {
                    message: 'true',
                    AccesToken: accessToken,
                    info: rows[0]
                }
            }
        }
        else{
            var result = {
                "code" : 400,
            }
        }

    } catch(e){
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

router.post('/echeck', async function(req, res, next){
    var email = req.body.email;

    try{
        var resu = await con.promise().query('SELECT EXISTS (SELECT email FROM user_info where email = ?) as success;',[email]);
        
        if(resu[0][0].success){
            var result = {
                "code" : 200,
                "data" : {
                    message: 'true'
                }
            }
        
        }
        else{
            var result = {
                "code" : 400,
                "data" : {
                    message: 'false'
                }
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

router.post('/phone', async function(req, res, next){
    try{
        var check = req.body.check;
        if (check == 456){
            var result = {
                "code" : 200,
                "data" : {
                    message: 'true'
                }
            }
        }
        else{
            var result = {
                "code" : 400,
                "data" : {
                    message: 'false'
                }
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

router.post('/pcheck', async function(req, res, next){
    var phone = req.body.phone;

    try{
        var resu = await con.promise().query('SELECT EXISTS (SELECT phone FROM user_info where phone = ?) as success;',[phone])

        if(resu[0][0].success){
            var result = {
                "code" : 200,
                "data" : {
                    message: 'true'
                }
            }
        
        }
        else{
            var result = {
                "code" : 400,
                "data" : {
                    message: 'false'
                }
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


router.post('/regist', async function(req, res, next) { //동의 여부 자동으로 넣기
    var name = req.body.name;
    var pw = req.body.pw;
    var email = req.body.email;
    var phone = req.body.phone;
    var bank = req.body.bank;
    var bank_account = req.body.bank_account;
    var agree = 'yes';

    // console.log(req);

    while(1){ 
        var id = Math.floor((Math.random() * 88888) + 11111);
        var resu = await con.promise().query('SELECT EXISTS (SELECT id FROM user_info where id = ?) as success;',[id]);
        if(!resu[0][0].success){
            break;
        }
    }

    var params = [id, name, pw, email, phone, bank, bank_account,agree];

    try{
        await con.promise().query('INSERT INTO user_info(id, name, pw, email, phone, bank, bank_account,agree) VALUES ?;', [[params]]);
        var result = {
            "code" : 200,
            "data" : {
                message: 'true',
                id: id,
            }
        }
    } catch(e){
        console.log(e);

        var result = {
            "code" : 500,
            "data" : {
                message: 'false',
                err: e.code
            }
        }
    };

    res.send(result);
});


router.post('/bank', async function(req, res, next) { // 중복체크로 변경
    var bank_account = req.body.bank_account;
    
    try{
        var resu = await con.promise().query('SELECT EXISTS (SELECT bank_account FROM user_info where bank_account = ?) as success;',[bank_account]);
        
        if(resu[0][0].success){
            var result = {
                "code" : 200,
                "data" : {
                    message: 'true'
                }
            }
        
        }
        else{
            var result = {
                "code" : 200,
                "data" : {
                    message: 'false'
                }
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