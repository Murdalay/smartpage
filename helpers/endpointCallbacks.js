'use strict'
module.exports = function(that) {
	this.endpointCallbacks = {
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

	return this
};