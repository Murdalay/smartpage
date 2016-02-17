var winston = require('winston');
var path = require('path');
var mail_opts = {
    to: 'murdalay@gmail.com',
    host: 'smtp.gmail.com',
    secure: true,
    username: 'jozhsbr@gmail.com',
    password: 'Omhg2P[33o<',
    html : true,
    level: 'error'
};

var Mail = require('winston-mail').Mail;
var defLogger = false;

var devLogger = function() { 
	return new (winston.Logger)({
	    transports: [
	        new winston.transports.Console({ 
	        	showLevel : true, 
	        	prettyPrint : true, 
	        	level: 'debug',
	        	colorize: true 
	        })
	    ],

	    exceptionHandlers: [
	        new winston.transports.Console({ 
	        	showLevel : true, 
	        	timestamp : true,
	        	prettyPrint : true, 
	        	humanReadableUnhandledException : true, 
	        	colorize: true 
	        }),

	        new winston.transports.File({ 
	        	showLevel : true,
	        	timestamp : true,
	        	prettyPrint : true, 
	        	silent : true, 
	        	filename: path.join(__dirname, 'logs', 'errors.log') 
	        })
	    ],

	    exitOnError: true
	});
}

var prodLogger = function() { 
	return new (winston.Logger)({
	    transports: [
	        new winston.transports.Console({ 
	        	prettyPrint : true, 
	        	level: 'info', colorize: true,
	        	colorize: true 
	        })
	    ],

	    exceptionHandlers: [
	        new winston.transports.Console({ 
	        	humanReadableUnhandledException : true, 
	        	timestamp : true,
	        	colorize: true 
	        }),

	        new winston.transports.Mail(mail_opts),

	        new winston.transports.File({ 
	        	silent : true, 
	        	timestamp : true,
	        	filename: path.join(__dirname, 'logs', 'errors.log') 
	        })
	    ],

	    exitOnError: false
	});
}

module.exports = function(dev) {
	if(!defLogger) {
		defLogger = dev ? devLogger() : prodLogger();
	}
	
	return defLogger;
}