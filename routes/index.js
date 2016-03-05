'use strict'
var path = require('path');
var express = require('express');
var router = express.Router();
var userRoutes = express.Router();
var passport = require('passport');
var request = require('request');
var multer  = require('multer');
var fs = require('fs');
var dir;
var DataLayer = require(path.join(__dirname, '..', 'helpers', 'stormpath-dl-provider'));
var DL;

var funcGroupTypesCb = {
	filter : function(fGroup, params, cb) {
		log.info('fGroup is', fGroup);
		log.info('params.criteria', params.criteria);

		if(!params.criteria) {
			return log.error('filter criteria must be provided');
		}

		if(fGroup.dataLayer === 'users') {
			if(params.level === 'dir') {
				if(!!params.customData) {
					this.dirAccounts({ expand:'customData' }, function(err, accounts) {
						accounts.filter(function(application, callback) {
							if(typeof params.criteria.shouldBe === 'boolean') {
								if(params.criteria.shouldBe) {
									application.getCustomData(function(err, customData) {
										//filter
										callback(!!customData[params.criteria.field]);
									});
								} else {
									application.getCustomData(function(err, customData) {
										//filter
										callback(!customData[params.criteria.field]);
									});									
								}
							}
						}, function(results) {
							cb && cb(results);
						});
					});
				} else {
					this.dirAccounts(function(err, accounts) {
						accounts.filter(function(application, callback) {
							callback(!!application[params.criteria.field]);
						}, function(results) {
							cb && cb(results);
						});
					});
				}
			}
		} else {
			log.info('dataLayer is unsupported by filter');
		}
	}
};


function goBack(req, res, next) {
	res.redirect('back');
}


function getMessageForError(messages, err, req) {
	var _message;

	for (let code in messages.errors.apiCodes) {
		if(code == err.code + '') {
			_message = messages.errors.apiCodes[code];
			break
		}
	}

	_message || (_message = err.userMessage ? err.userMessage : err.message);
	log.error(_message);
	req && req.flash('error', _message);
}


var funcCompTypesCb = {
	content : function(fComp, params, fileldset) {
		log.debug('fComp is', fComp);
		log.debug('params is', params);
		log.debug('fileldset is', fileldset);
	}
};

var _layers = {
	finance : process.env['DL_LAYER_FINANCE']
}

function onInit(err, data) {
	if(err) {  throw new Error('Error initing basic data layers') };

	log.verbose('Data layers successfully inited!');
	DL('get', 'dir')(function() { 
		this.registerEndPoints(endpointCallbacks);
		// this.updateAccounts(function(err) {  });

		function showPassUpdatePage(req, res, next) {
			var _messages = this.getMessages();

			res.render('enter', {
				block : 'enter',
				bundle : 'enter',
				error : req.flash('error')[0],
				info : req.flash('info'),
				formUrl : '/passUpdate/' + makeHashForEmail(req.user.email),
				hiddenInputs : [
					{ name : 'secHash', val : makeHashForEmail(req.user.href) },
					{ name : 'resetToken', val : req.user.resetToken }
				],
				caption : _messages.info.resetPasswordAlert,

				firstInput: {
					name : 'password',
					placeholder : _messages.password,
					type : 'password'
				},

				secondInput: {
					name : 'password-re',
					placeholder : _messages.password,
					type : 'password'
				},

				title : _messages.renewPass
			});
		}

		router.post('/restore', makeCheckEmailSubmissionMidleware(this.getMessages()), resetPassMidleware.bind(this), goBack);
		router.post('/passUpdate/:accHash', updatePassMidleware, goBack);
		router.get('/passwordReset', verifyPassTokenMidleware.bind(this), showPassUpdatePage.bind(this));
		
		var grpoups = this.getGroups();
		
		for (let name in grpoups) {
			// performing initialization for each group in dir with apropriate context
			DL('get', 'group', name)(function() {
				this.registerEndPoints(endpointCallbacks);
				
				// summoning routes for each registred page
				this.initPages(function() {
					//TODO : remove active
					function displayPage(req, res, next) {
						this.initFuncGroups(function(data) {
							res.render(this.getBundle(), {
								block : this.getTemplate(),
								bundle : this.getBundle(),
								error : req.flash('error'),
								info : req.flash('info'),
								appData : this.getCustomData(),
								menu : this.getHeader(),
								title : this.getTitle(),
								messages : this.getMessages(),
								active : [ true, true, false, false ],
								helpers : { makeHashForString : makeHashForEmail },
								inside: data
							});
						});
					}

					log.debug('getName', this.getName());
					log.debug('getPage', this.getPage());
					log.debug('getTemplate', this.getTemplate());
					log.debug('getTitle', this.getTitle());
					log.debug('getHeader', this.getHeader());
					log.debug('getPaths().basePath', this.getPaths().basePath);
					log.debug('getEndpoints', this.getEndpoints());

					var _grpName = this.getGroupName();
					router.get(this.getHeader().basePath + '/' + this.getName(), 
						makeVerifyGroupAccessMidleware(_grpName), 
						displayPage.bind(this));
				});
			});
		}
	});
}

DL = DataLayer(_layers, { funcGroupTypesCb : funcGroupTypesCb, funcCompTypesCb : funcCompTypesCb }, onInit);


function setCookieByNameFromQueryParams(name) {
	return function (req, res, next) {
		var val = req.query[name];

		// check if client sent cookie
		if(val) {
			var cookie = req.cookies[name];
				res.cookie(name, val, { maxAge: 9000000, httpOnly: true });
				log.info('cookie created successfully');
		}
		next();
	};
}

function markWithCookie(name, val) {
	return function (req, res, next) {
		// check if client sent cookie
		if(val) {
			var cookie = req.cookies[name];
			if (cookie === undefined) {
				res.cookie(name, val, { maxAge: 9000000, httpOnly: true });
				log.info('cookie created successfully');
			} else { 
				log.info('cookie exists', cookie); 
			} 
		} else {
			// marking with unique string if no val passed
			var val = Math.random().toString();
			val = randomNumber.substring(2,randomNumber.length);
			res.cookie(name, val, { maxAge: 9000000, httpOnly: true });
		}
		next();
	};
}


function makeUserLoginRedirectMidleware(redirectPoint) {
	return function(req, res, next) {
		if (!req.user || req.user.status !== 'ENABLED') {
			return res.redirect(redirectPoint);
		}

		return next();
	}
}

var checkIfUserLogedIn = makeUserLoginRedirectMidleware('/login');

function makeCheckEmailSubmissionMidleware(messages) {
	return function(req, res, next) {
		var email = req.body.email;

		if (!email) {
			req.flash('error', messages.errors.notAllFilled);
			return res.redirect('back');
		}

		var _mailRegexp = /^([a-z0-9_-]+\.)*[a-z0-9_-]+@[a-z0-9_-]+(\.[a-z0-9_-]+)*\.[a-z]{2,6}$/;

		var _isMail = _mailRegexp.test(email);

		if(!_isMail) {
			req.flash('error', messages.errors.notMail);
			return res.redirect('back');
		}

		return next();
	}
}

function makeCheckPasswordSubmissionMidleware(messages) {
	return function(req, res, next) {
		var password = req.body.password;

		if (!password) {
			req.flash('error', messages.errors.notAllFilled);
			return res.redirect('back');
		}

		return next();
	}
}

function makeVerifyGroupAccessMidleware(grpName) {
	return DL('run', 'group', grpName)(function(req, res, next) {
		var _failRedirect = this.getEndpoints().login.failureRedirect;
		var _grpName = this.getName();

		if (!req.user || req.user.status !== 'ENABLED') {
			req.flash('error', this.getMessages().errors.logError);
			return res.redirect(_failRedirect);
		}

		log.verbose('Verifying access. User should be member of %s group', _grpName);
		if (!req.user.groups || !req.user.groups[_grpName]) {

			log.debug('req.user.groups', req.user.groups);
			this.getAccountByUrl(req.user.href, (err, account) => {
				
				this.updateAccount(account);

				account.getGroups({ name: _grpName }, 
					function(err, groups) {
						groups.each((group, cb) => {
							if (group) {
								let _name = {};
								
								_name[group.name] = true;

								req.user.groups || (req.user.groups = {});
								req.user.groups = extend(req.user.groups, _name);
								
								log.verbose('Success!');
								return next()
							}

							cb();
						},
						(err) => {
							if (err) {
								req.flash('error', err);
								log.verbose('User %s login failed', req.user.username);
							}

							req.flash('error', 'Печалька, но вы не админ (');
							return res.redirect(_failRedirect);
						});
					} 
				);
			})
		} else {
			log.verbose('Success!');
			return next();
		}
	});
}

function isProfileFiled (user) {
	return user.username !== 'null' && user.givenName  !== 'null' && user.surname !== 'null';
}


function resetPassMidleware(req, res, next) {
	var _email = req.body.email;
	var _messages = this.getMessages();

	DL.proc.sendResetPassEmail(_email).then((response) => {
			req.flash('info', _messages.info.resetSuccess);
			return next();
		}, (err) => {
			getMessageForError(_messages, err, req);
			return next();
		}
	);
}

function verifyPassTokenMidleware(req, res, next) {
	var _messages = this.getMessages();
	var _token = req.query.sptoken;

	DL.proc.verifyPassResetToken(_token).then((acc) => {
			req.user || (req.user = {});
			req.user.href = acc.href;
			req.user.email = acc.email;
			req.user.resetToken = _token;

			return next();
		}, (err) => {
			getMessageForError(_messages, err, req);
			return res.redirect('/verify-error.html');
		}
	);
}

var updatePassMidleware = DL('run', 'dir', 'base')(function (req, res, next) {
	var _login = this.getEndpoints().login.failureRedirect;
	var _messages = this.getMessages();
	var _accHash = req.params.accHash;
	var _secHash = req.body.secHash;
	var _pass = req.body.password;
	var _token = req.body.resetToken;

	if (!_pass) {
		req.flash('error', 'You must provide a new password to update');
		return next();
	} else if (req.body['password-re'] !== _pass) {
		req.flash('error', 'Please check your input. The password confirmation field value differs from the original password');
		return next();
	}

	if (_accHash && _secHash && _token) {
		var _accToConfirm = this.getAccountByHash(_accHash);

		if (_accToConfirm && makeHashForEmail(_accToConfirm.href) === _secHash) {
			DL.proc.resetUserPass(_pass, _token).then((result) => {
				req.flash('info', 'You password is successfully uptated');
				return res.redirect(_login);
			}, (err) => {
				getMessageForError(_messages, err, req);
				return next();
			});

		} else {
			req.flash('error', 'Unable to confirm password update');
			return next();
		}
	} else {
		req.flash('error', 'Unable to verify password update');
		return next();
	}
});


var endpointCallbacks = {
	login : function(endpoint, messages, extra) {
		log.info('Enabling login endpoint');

		router.get(endpoint.url, (req, res, next) => {
			res.render('enter', {
				block : 'enter',
				bundle : 'enter',
				error : req.flash('error')[0],
				info : req.flash('info'),
				messages : messages,

				firstInput: {
					name : endpoint.extra.firstInputName,
					placeholder : messages.email
				},
				secondInput: {
					name : endpoint.extra.secondInputName,
					placeholder : messages.password
				},

				title : messages.login
			});
		});

		router.post(
			endpoint.url,
			passport.authenticate(
				'stormpath',
				{
					successRedirect: endpoint.successRedirect,
					failureRedirect: endpoint.failureRedirect,
					failureFlash: messages.errors.logError
				}
			)
		);
	},

	verify : function(endpoint, messages, extra) {
		log.info('Enabling mail token verification endpoint');

		router.get(endpoint.url, function(req, res, next) {
			DL.proc.verifyMailConfirmationToken(req.query.sptoken)
				.then(
					function(message) {
						req.flash('info', messages.verifySuccess);
						return res.redirect(endpoint.successRedirect);
					}, 
					function(err) {
						return res.redirect(endpoint.failureRedirect);
					}
				);
		});
	},

	register : function(endpoint, messages, extra) {
		log.info('Enabling registration endpoint');

		// Render the registration page.
		router.get(endpoint.url, setCookieByNameFromQueryParams('ref_id'), function(req, res) {
			res.render('enter', {
				block : 'enter',
				bundle : 'enter',
				error : req.flash('error')[0],
				info : req.flash('info'),
				caption : messages.info.passwordAlert,

				firstInput: {
					name : endpoint.extra.firstInputName,
					placeholder : messages.email
				},
				secondInput: {
					name : endpoint.extra.secondInputName,
					placeholder : messages.password
				},

				title : messages.register
			});
		});

		// Register a new user to Stormpath.
		router.post(endpoint.url, 
			makeCheckEmailSubmissionMidleware(messages), 
			makeCheckPasswordSubmissionMidleware(messages), 
			function(req, res, next) {
				DL.proc.registerUserByEmail(req.body.email, req.body.password, req.cookies['ref_id'])
					.then(function(response){
							log.verbose(response);
							return res.redirect(endpoint.successRedirect);
						}, 
						function(err) {
							req.flash('error', err);
							return res.redirect(endpoint.failureRedirect);
						}
					);
			}
		);
	},

	resetPass : function(endpoint, messages, extra) {
		log.info('Enabling resetPass endpoint');

		// Render the registration page.
		router.get(endpoint.url, function(req, res) {
			res.render('enter', {
				block : 'enter',
				bundle : 'enter',
				error : req.flash('error')[0],
				info : req.flash('info'),
				caption : messages.info.resetPasswordAlert,

				firstInput: {
					name : endpoint.extra.firstInputName,
					placeholder : messages.email
				},

				title : messages.resetPass
			});
		});
	}
};


var uploader = multer({
	dest : './photos/',

	rename : function(fieldname, filename) {
		return filename;
	},

	limits : {
		fileSize : 5242880  
	},

	fileFilter : DL('run', 'dir')(function(req, file, cb) {
		var _oldFile = file.originalname;
		
		_oldFile = _oldFile.split('.');
		var _ext = _oldFile[_oldFile.length - 1];


		if(_ext !== 'png' && _ext !== 'jpg' && _ext !== 'bmp' && _ext !== 'gif') {
			req.flash('error', this.getMessages().errors.unsupported);

			cb(null, false);
		} else {
			cb(null, true);
		}
	}),

	onFileUploadStart: function (file) {
		log.info(file.originalname + ' is starting ...\n');
	},

	onFileUploadComplete: function (file) {
		log.info(file.fieldname + ' uploaded to  ' + file.path);
		done=true;
	}
}).single('avatar');

var checkPayRequestMidleware = DL('run', 'dir')(function (req, res, next) {
	for (let key in req.body) {
		if(req.body.hasOwnProperty(key)) {
			var _accToConfirm = this.getAccountByHash(key);

			_accToConfirm && DL.proc.confirmPayRequest(_accToConfirm.href, req.params.payId).then(
				data => {
					log.info('Payment confirmed. With status: «%s»', data);
					req.flash('info', 'Payment confirmed. With status: «' + data + '»');
					next();
				},

				data => {
					log.error('Payment rejected. With status: «%s»', data);
					req.flash('error', 'Payment rejected. With status: «' + data + '»');
					next();
				}
			);

			break
		}
	}

	if (!_accToConfirm) {
		log.warn('Unable to complete payment');
		req.flash('error', 'Unable to complete payment');
		next();
	}
});

router.post('/api/pay/:payId', checkPayRequestMidleware, goBack);
router.get('/api/pay/', goBack);

var renderSingleAccountPage = DL('run', 'dir')(function(href, req, res, next, bundle) {
	function _renderAccountPage(err, account) {
		if (err) { return next(err); }

		this.updateAccount(account);

		var _link = { reflink : makeRefLink('ref_id', this.getDefConf().domain + this.getEndpoints().register.url + '/', account.email) };
		var _ref = account.customData.referrer && !!this.getAccountByHash(account.customData.referrer) ? this.getAccountByHash(account.customData.referrer) : null;
		var _referrer = _ref ? { referrer : _ref.fullName && _ref.fullName !== 'null null' ? _ref.fullName : _ref.email } : {};
		var _balance = account.customData.balance;
	
		res.render(bundle ? bundle : 'statistic', {
			block : 'container',
			bundle : bundle ? bundle : 'statistic',
			error : req.flash('error'),
			info : req.flash('info'),
			user : extend({}, account.customData),
			menu : extend({}, this.getCustomData().menuUserAdmin),
			balance : _balance,
			messages : this.getMessages(),
			active : [ true, isProfileFiled(account) && account.customData.phone, !!account.customData.payed, true ],
			custom : account.customData,
			inside: [
				{
					block : bundle ? bundle : 'statistics',
					uData : 
						{
							isfiled : {
								profile : isProfileFiled(account),
								template : !!account.customData.template
							},
							user : account,
							custom : extend({}, account.customData, _link, _referrer)
						},
					appData : this.getCustomData(),
					messages : this.getMessages(),
					conf : this.getConf(),
					clientData : { balance : _balance },
					photo : account.customData.photo && account.customData.photo.path
				}
			]
		});
	}

	this.getAccountByUrl(href, _renderAccountPage.bind(this));
});

function makeUserPageByIdMidleware(page){
	return DL('run', 'dir')(function(req, res, next) {
		var _id = req.params.userId;

		if(!_id) { return next(); }

		var _acc = this.getAccountByHash(_id);

		if(!_acc) { return next(); }

		renderSingleAccountPage(_acc.href, req, res, next, page);
	});
}

function showCurrentUserProfilePage(req, res, next) {
	renderSingleAccountPage(req.user.href, req, res, next, 'profile');
}

function showCurrentUserEditPage(req, res, next) {
	renderSingleAccountPage(req.user.href, req, res, next, 'edit');
}

function showCurrentUserStatPage(req, res, next) {
	renderSingleAccountPage(req.user.href, req, res, next);
}

router.get('/dashboard/statistic', checkIfUserLogedIn, showCurrentUserStatPage);
router.get('/dashboard/profile', checkIfUserLogedIn, showCurrentUserProfilePage);
router.get('/dashboard/edit', checkIfUserLogedIn, showCurrentUserEditPage);

// it gives us an ability to view pages of other users
router.get('/api/users/profile/:userId', checkIfUserLogedIn, makeUserPageByIdMidleware('profile'), goBack);
router.get('/api/users/edit/:userId', checkIfUserLogedIn, makeUserPageByIdMidleware('edit'), goBack);
router.get('/api/users/statistic/:userId', checkIfUserLogedIn, makeUserPageByIdMidleware(), goBack);

// Logout the user, then redirect to the home page.
router.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

// Render the dashboard page.
router.get('/dashboard', checkIfUserLogedIn, function (req, res) {
	return res.redirect('/dashboard/profile');
});

// Render the payment page.
router.get('/dashboard/payment', checkIfUserLogedIn, DL('run', 'dir')(function (req, res) {
	this.getAccountByUrl(req.user.href, (err, account) => {
		
		this.updateAccount(account);
		
		res.render('payment', {
			block : 'container',
			error : req.flash('error'),
			info : req.flash('info'),
			menu : this.getCustomData().menuUserAdmin,
			messages : this.getMessages(),
			user : account.customData,
			custom : account.customData,
			bundle : 'payment',
			active : [ true, true, !!account.customData.payed, true ],
			inside: [
				{
					block : 'pay',
					appData : this.getCustomData(),
					conf : this.getConf(),
					js : {
						subscriptions : this.getCustomData().subscriptions,
						bonus : account.customData.bonus ? this.getCustomData().bonus[account.customData.bonus] : ''
					},
					uData : {
						user : req.user,
						custom : account.customData,
						bonus : this.getCustomData().bonus[account.customData.bonus],
						payed : account.customData.payed
					},

					clientData : { balance : account.customData.balance }
				}
			]
		});
	});
}));

router.post('/dashboard/edit', checkIfUserLogedIn, function (req, res, next) {
	req.user.customData.extraFields || (req.user.customData.extraFields = {});

	for (let key in req.body) {
		req.user.customData.extraFields[key] = req.body[key];
	}
	
	// saving custom fields
	req.user.customData.save(function (err) {
		if (err) {
			next(err);
		} else {
			res.redirect('back');
		}
	});
});

router.post('/dashboard/pay', checkIfUserLogedIn, DL('run', 'dir')(function (req, res, next) {
	req.user.customData.payRequest || (req.user.customData.payRequest = {});

	for (let key in req.body) {
		req.user.customData.payRequest[key] = req.body[key];
	}

	req.user.customData.payRequest.date = Date.now();

	var _fromBalance = req.body.payMethod === 'fromBalance';

	// saving custom fields
	req.user.customData.payed || (req.user.customData.payed = 'waiting');
	req.user.customData.save(err => {
		if (err) {
			next(err);
		} else {
			req.flash('info', this.getMessages().pay.thanks);
			res.redirect('back');
		
			if (!_fromBalance) {
				// sending billing email to user
				var _locals = { 
					title : this.getMessages().pay.billName,
					name : req.user.givenName,
					invoice : { 
						payer : req.user.fullName,
						name : req.user.username,
						sum : req.body.sum,
						date : Date.now()
					},
					services : [{ 
						name : this.getMessages().pay.buySubscription + req.body.subscription,
						sum : req.body.sum
					}],
					supportMail : this.getConf().def.emails.Support
				};

				mailer.sendMailTemplate(this.getDefConf().emails.Support, 
					req.user.email, this.getMessages().pay.billingMailTheme, 
					'../email.templates/payrequest-invoice.html', 
					_locals);
			}
		}
	});
}));

function storeUserPhotoMidleware(req, res, next) {
	uploader(req, res, DL('run', 'dir')(function (err) {
		if (err) {
			// An error occurred when uploading
			return next(err);
		}

		if (!req.file) {
			res.redirect('back');
		} else if (req.file.size > 1024288) {
			req.flash('error', this.getMessages().errors.toBig);
			res.redirect('back');
			fs.unlink(req.file.path, function(err) {
				if (err) {
					log.error('Unable to delete oversized photo', err);
				}
			})
		} else {
			var _oldFile = req.file.originalname.split('.');
			var _ext = _oldFile[_oldFile.length - 1];

			this.getAccountByUrl(req.user.href, (err, account) => {
				if (err) { return next(err) }

				// checking if photo is already assigned for the account and deleting the photo if so
				var _oldPhoto = false;
				account.customData.photo && (_oldPhoto = account.customData.photo.path);

				req.user.customData.photo = { path : req.file.path, ext : _ext };

				this.updateAccount(account);
				req.user.customData.save((err) => {
					if (err) {
						next(err);
					} else {
						res.redirect('back');

						_oldPhoto && fs.unlink(_oldPhoto, err => {
							if (err) {
								log.error('Unable to delete old photo', err);
							}
						})
					}
				});
			});
		}
	}))
}

var storeUserDataMidleware = DL('run', 'dir')(function(req, res, next) {
	if (!req.body.name || !req.body.surname) {
		req.flash('error', this.getMessages().errors.mustFillPersonalData);
		return res.redirect('back');
	}

	if (!req.body.username){
		req.flash('error', this.getMessages().errors.mustFillUsername);
		return res.redirect('back');
	}

	var _href = req.user.href;
	var _updateAcc = DL('run', 'dir')(function(href) {
		this.getAccountByUrl(href, (err, account) => {
			if (err) {
				log.error(err)
			} else {
				this.updateAccount(account);
			}
		});
	});

	// removing spaces from username
	req.body.username = req.body.username.replace(/[\ ]/g, '');

	if(req.user.username !== req.body.username){
		this.getAccounts({ username: req.body.username }, (err, accounts) => {

			accounts.each((account, cb) => {
				req.flash('error', this.getMessages().username + ' ' + req.body.username + ' ' + this.getMessages().errors.alreadyExists);
				return res.redirect('back');

			}, (err) => {
				if (err) { log.error(err) }

				// saving default fields
				req.user.givenName = req.body.name;
				req.user.surname = req.body.surname;
				req.user.username = req.body.username;

				req.user.save((err) => {
					if (err) {
						log.error(err);
						next(err);
					}
				});

				// saving custom fields
				req.user.customData.phone = req.body.phone;

				req.user.customData.save((err) => {
					if (err) {
						log.error(err)
						next(err);
					} else {
						_updateAcc(_href);

						return res.redirect('back');
					}
				});
			});
		});
	} else {
		req.user.givenName = req.body.name;
		req.user.surname = req.body.surname;

		req.user.save(err => {
			if (err) {
				log.error(err);
				next(err);
			}
		});

		// saving custom fields
		req.user.customData.phone = req.body.phone;

		req.user.customData.save(err => {
			if (err) {
				next(err);
			} else {
				_updateAcc(_href);

				return res.redirect('back');
			}
		});
	}
});

// photo upload handling
router.post('/dashboard/profile/user/photo',  checkIfUserLogedIn, storeUserPhotoMidleware, goBack);
router.post('/dashboard/profile/user', checkIfUserLogedIn, storeUserDataMidleware, goBack);

/// pages form submit mail
router.post('/api/mailer', DL('run', 'dir')(function (req, res, next) {
	var _locals = { 
		type : 'good', 
		alert : 'Запись на семинар',
		sender : { 
			name : req.body.name,
			phone : req.body.number,
			email : req.body.Email
		},
		supportMail : this.getDefConf().emails.Support
	};

	mailer.sendMailTemplate(this.getDefConf().emails.Support, req.body.ownerMail, 'Запись на семинар', '../email.templates/form-submit.html', _locals)
		.then(function(response) {
				res.status(200).end();
			}, function(response) {
				res.status(500).end('Unable to send mail');
			});
}));

// function renderUserLandingPage(req, res, next) {
// 	return DL('run', 'dir')(function (account) {
// 		log.debug('Rendering user %s landing page', account.username);
// 		var _name = 'landing-' + (account.customData.template ? account.customData.template : 'start');
	
// 		res.render(_name, {
// 			block : _name,
// 			bundle : _name,
// 			user : extend({}, account.customData),
// 			clientData : extend({}, account.customData.extraFields, { name : account.fullName, phone : account.customData.phone, email : account.email, ava : !!account.customData.photo ? account.customData.photo.path : '/images/avatar.png' })
// 		});
// 	});
// }

function renderUserLP(req, res, next) {
	return DL('run', 'dir')(function (account) {
		log.debug('Rendering user %s landing page', account.username, account);
		var _name = 'landing-' + (account.customData.template ? account.customData.template : 'start');
		var _news = this.getCustomData().news;

		var localData = extend(
			{}, 
			account.customData.extraFields, 
			{ 
				name : account.fullName, 
				phone : account.customData.phone, 
				email : account.email, 
				ava : !!account.customData.photo ? account.customData.photo.path : '/images/avatar.png' 
			},
			{ 
				news : _news
			});
		
		swig.renderFile(_name +'.html', localData, function (err, output) {
		  if (err) {
		    throw err;
		  }
		  res.send(output);
		});
	});
}

function showPayedUserPagesMidleware(req, res, next) {
	var _username = req.params.username;
	var _arg = arguments;

	function _checkIfPayed(account) {
		log.info('Checking if account %s is payed', account.username);

		if(account.customData.payed === 'active') {
			if(!req.cookies['counted']) {
				var addVisitToUserStat = DL('run', 'dir')(function(url) {
					this.getAccountByUrl(url, (err, account) => {
					    if (err) { return log.error(err); }
						
						log.verbose('Trying to store visits statistic for %s', account.username);

						account.customData.statistic && account.customData.statistic.visits || (account.customData.statistic = extend(account.customData.statistic, { visits : [] }))
						account.customData.statistic.visits.push(Date.now());
						
						this.updateAccount(account);
						account.customData.save(function(err) {
						    if (err) { log.error(err); }

						    log.info('done');
						});
					})
				});

				addVisitToUserStat(account.href);

				// relaying on browser cookie invalidation to filter visits
				res.cookie('counted', Date.now(), { maxAge: 3600000, httpOnly: true });
			}

			renderUserLP.apply(this, _arg)(account);
		} else {
			res.status(404);
			return next();
		}
	}

	function _notFound(err) {
		res.status(404);
		return next(err);
	}

	DL('get', 'dir')(function() {
		let _usr = this.getAccountByUsername(_username);
		log.warn('User is', _usr)

		if(_usr) {
			_checkIfPayed(_usr);
		} else {
			_notFound();	
		}
	});
}

userRoutes.get('/:username', showPayedUserPagesMidleware);


module.exports = { userRoutes : userRoutes, router : router };
