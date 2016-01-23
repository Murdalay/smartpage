var Q = require('vow');
var nodemailer = require('nodemailer');
// var emailTemplates = require('email-templates');
var EmailTemplates = require('swig-email-templates');

var smtpTransport = require('nodemailer-smtp-transport');
 
module.exports = {
	_transport : nodemailer.createTransport(
		smtpTransport({
			service: 'gmail',
			auth: {
				user : 'jozhsbr@gmail.com',
				pass : 'Omhg2P[33o<'
			}
		})
	),

	_template : new EmailTemplates({
		root: './email.templates/',
		filters: {
			upper: function(str) {
				return str.toUpperCase();
			},
			makeLink: function(str) {
				return '<a href=mailto:' + str + '>' + str + '</a>';
			},
			makeEmailLink: function(str) {
				return '<a href=mailto:' + str + '>' + str + '</a>';
			},
			makePhoneLink: function(str) {
				return '<a href=phone:' + str + '>' + str + '</a>';
			},
			money: function(str) {
				return this._config && this._config.currency ? this._config.currency + ' ' + str : '$ ' + str  ;
			}
		},
		juice: {
			webResources: {
				images: 24      // Inline images under 8kB
			}
		}
		// ,
		// rewriteUrl: function (url) {
		// 	return url + 'appendage';
		// }
	}),
 
	//  // инициализируем наш mailer component
	// init: function (config) {
	//    var d = Q.defer();
 
	//    // инициализация шаблонизатора
	//    emailTemplates(config.emailTplsDir, function (err, template) {
	//       if (err) {
	//          console.error(err);
	//          return d.reject(err);
	//       }
 
	//       this._template = template;
	//       // инициализация mailer’а
	//       this._transport = nodemailer.createTransport(
	//          smtpTransport({
	//             service: config.service,
	//             auth: config.auth
	//          })
	//       );
	//       d.resolve();
	//    }.bind(this));
 
	//    return d.promise;
	// },
 
	// отправка обычного e-mail
	sendMail: function (from, to, subject, text, html) {
		 var d = Q.defer();
		 console.log(d);

		 var params = {
				from: from, // адрес отправителя
				to: to, // список получателей через запятую
				subject: subject,
				text: text
		 };
 
		 if (html) {
				params.html = html;
		 }
 
		 this._transport.sendMail(params, function (err, res) {
				if (err) {
					 console.error(err);
					 d.reject(err);
				} else {
					 console.log(res);
					 d.resolve(res);
				}
		 });
 
		 return d.promise();
	},
 
	// отправка e-mail с шаблоном
	sendMailTemplate: function (from, to, subject, tplName, locals) {
	  var d = Q.defer();
		 
		this._template.render(tplName, locals, function (err, html, text) {
		    if (err) {
		        console.error(err);
		        return d.reject(err);
		    }
	 
		    this.sendMail(from, to, subject, text, html)
		        .then(function (res) {
		           d.resolve(res);
		        });
			}.bind(this));
 
	  return d.promise();
	}
};