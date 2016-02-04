var Express = require('express');
var ExpressBem = require('express-bem');
var watch = require('node-watch');
var path = require('path');
var logger = require('morgan');
var winston = require('winston');
var isDevMode = process.env.NODE_ENV === 'Dev' || process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'development';
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var StormpathStrategy = require('passport-stormpath');
var session = require('express-session');
var flash = require('connect-flash');
var exec = require('child_process').exec;
var mail_opts = {
    to: 'murdalay@gmail.com',
    host: 'smtp.gmail.com',
    secure: true,
    username: 'jozhsbr@gmail.com',
    password: 'Omhg2P[33o<',
    level: 'error'
};

var Mail = require('winston-mail').Mail;

// create app and bem
var app = Express();
var bem = ExpressBem({
    projectRoot: './',  
    cache: {
        load: true, // don't reload
        exec: false // but execute with context
    },      // bem project root, used for bem make only
    path: './desktop.bundles' // path to your bundles
});

// here to lookup bundles at your path you need small patch
app.bem = bem.bindTo(app);

if (isDevMode) {
    bem.usePlugin(process.env.EXPRESS_BEM_MAKER === 'enb' ? 'express-bem-enb-make' : 'express-bem-tools-make',
        { verbosity:  'error'});

        var filter = function(pattern, fn) {
        return function(filename) {
            if (pattern.test(filename)) {
                fn(filename);
            }
        }
    }
     
    watch(path.join(__dirname, 'common.blocks'), filter(/\.js$|\.styl$|\.bemhtml$/, function(filename) {
        console.log(filename);

        var child = exec('bem make desktop.bundles/payment',
        function (error, stdout, stderr) {
            console.log('stdout: ' + stdout);
            console.log('stderr: ' + stderr);
            if (error !== null) {
                console.log('exec error: ' + error);
            }
        });
    }));
}


var log = new (winston.Logger)({
    transports: [
        new winston.transports.Console({ level: 'info', colorize: true })
    ],
    exceptionHandlers: [
        new winston.transports.Console({ humanReadableUnhandledException : true, colorize: true }),
        new winston.transports.Mail(mail_opts),
        new winston.transports.File({ html : true, filename: path.join(__dirname, 'logs', 'errors.log') })
    ],
    exitOnError: false
});

// register engines
bem.usePlugin('express-bem-bemtree'); // requires module express-bem-bemtree
bem.usePlugin('express-bem-bemhtml'); // ... express-bem-bemhtml

bem.engine('fullstack', '.bem', ['.bemhtml.js', '.bemtree.js'], function (name, options, cb) {
    var view = this;

    // pass options.bemjson directly to bemhtml
    if (options.bemjson) return view.thru('bemhtml');

    // return bemjson if requested
    if (options.raw === true) return view.thru('bemtree');

    // full stack
    view.thru('bemtree', name, options, function (err, bemjson) {
        if (err) return cb(err);

        options.bemjson = bemjson;
        view.thru('bemhtml', name, options, function (err, data) {
            if (err) return cb(err);
            cb(null, data);
        });
    });
});

// set default engine extension
app.set('view engine', '.bem');


var routes = require('./routes/index').router;
var userRoutes = require('./routes/index').userRoutes;
var strategy = new StormpathStrategy();


passport.use(strategy);
passport.serializeUser(strategy.serializeUser);
passport.deserializeUser(strategy.deserializeUser);


app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(session({ secret: process.env.EXPRESS_SECRET, key: 'sid', cookie: { secure: false } }));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use('/', Express.static(path.join(__dirname, 'public')));
app.use('/', Express.static(path.join(__dirname, 'desktop.bundles')));
app.use('/libs', Express.static(path.join(__dirname, 'libs')));
app.use('/photos', Express.static(path.join(__dirname, 'photos')));


app.use(routes);
app.use(userRoutes);

/// catch 404 and forwarding to error handler
// app.use(function(req, res, next) {
//     var err = new Error('Not Found');
//     err.status = 404;
//     next(err);
// });

/// error handlers

// development error handler
// will print stacktrace
if (isDevMode) {
        app.use(function(err, req, res, next) {
                res.status(err.status || 500);
                res.render('global-error', {
                        block : 'page',
                        content: err
                });

                log.warn(err);
        });
}



// production error handler
// no stacktraces leaked to user
// app.use(function(err, req, res, next) {
//     res.status(err.status || 500);
//     res.render('error', {
//         message: err.message,
//         error: {}
//     });
// });



var server = app.listen(process.env.NODE_PORT || process.env.PORT || 80, function () {
    console.log(process.env.NODE_PORT);
    var listenOn = server.address();
    console.log('Server listen on ' + listenOn.address + ':' + listenOn.port);
});
