var express = require('express');
var cors = require('cors');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var i18n = require('./i18n');

var routes = require('./routes/index');
var users = require('./routes/users');
var downloads = require('./routes/downloads');
var directories = require('./routes/directories');
var downloadHosts = require('./routes/downloadHosts');
var downloadHostPictures = require('./routes/downloadHostPictures');
var actions = require('./routes/actions');
var actionTypes = require('./routes/actionTypes');
var applicationConfiguration = require('./routes/applicationConfiguration');
var config = require("./configuration");
var heapdumpConfig = config.get('heapdump');

//kill -USR2 <pid>
if (heapdumpConfig.activated) {
    var heapdump = require('heapdump');

    process.chdir(heapdumpConfig.directory);

    if (heapdumpConfig.minute != 0) {
        setInterval(function () {
            heapdump.writeSnapshot()
        }, 6000 * heapdumpConfig.minute);
    }
}


var app = express();

app.set('models', require('./models'));
app.set('connection', require('./websocket'));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(i18n);
app.use(cors());

app.use('/', routes);
app.use('/users', users);
app.use('/downloads', downloads);
app.use('/directories', directories);
app.use('/downloadHosts', downloadHosts);
app.use('/downloadHostPictures', downloadHostPictures);
app.use('/actions', actions);
app.use('/actionTypes', actionTypes);
app.use('/applicationConfiguration', applicationConfiguration);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        /*res.render('error', {
            message: err.message,
            error: err
        });*/
        res.json({
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    /*res.render('error', {
        message: err.message,
        error: {}
    });*/
    res.json({
        message: err.message,
        error: {}
    });
});

module.exports = app;

//TODO: fermer la connexion mysql