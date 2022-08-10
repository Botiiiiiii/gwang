const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

var createError = require('http-errors');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const bodyParser = require('body-parser');
const multer = require('multer');
const form_data = multer();

require('dotenv').config();

var router = express.Router();

var options = {
    inflate: true,
    limit: '500kb',
    type: '*/*'
  };

app.use(bodyParser.urlencoded({limit: '700kb', extended: true}));
app.use(bodyParser.json({limit: '700kb'}));
app.use(bodyParser.raw(options));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.urlencoded({ extended: true}));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


// 라우터 선언
var User_process = require('./routes/user');
var Delivery_process = require ('./routes/delivery');
var Main_process = require ('./routes/main');
var Perform_process = require ('./routes/main');

app.use('/user', User_process);
app.use('/delivery', Delivery_process);
app.use('/main', Main_process);
app.use('/perform', Perform_process);

app.get('/', (req, res) => {
    res.json({
        success: true,
    });
});

app.listen(port, () => {
    console.log(`server is listening at localhost:${port}`);
});


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

//----------------------------------------------------------------

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
  });
  
  // error handler
  app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
  
    // render the error page
    res.status(err.status || 500);
    res.render('error');
  });


  module.exports = router;