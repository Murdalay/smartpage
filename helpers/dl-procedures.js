var request = require('request');

function addProc(dl) {
	var DL = dl;

	var procedures = {
		updateAccountsRefPayment : DL('run', 'layer', 'finance')(function() {
			var _refPayments = 0;

			function _getUnpayedRefPayments(referrer) {
				if (referrer && referrer.length) {
					var _unpayed = [];

					referrer.forEach(function(payment, index) {
						if (payment.status === 'not-payed') {
							_unpayed.push({ index : index, sum : payment.amount });
						}
					});

					return _unpayed.length ? _unpayed : null;
				} else {
					return null
				}
			}

			function payUnpayedRefPayments(account, payList) {
				if (account.customData && account.customData.refPayment) {
					var _profit = 0;

					for (key in payList) {
						payList[key].length && payList[key].forEach(function(item) {
							if(item.sum) {
								var _payment = account.customData.refPayment[key][item.index];
								_payment.status = 'confirmed';
								_profit += item.sum;

								account.customData.refPayment[key][item.index] = _payment;
							}
						});
					}

					account.customData.balance ? (account.customData.balance += _profit) : (account.customData.balance = _profit);

					return { account : account, payouts : _profit };
				} else {
					return null
				}
			}

			function _onProccessEnd(err, res) {
				log.info('All accounts are processed\n\n');
				log.info('Referal debt is: ');
				log.info(_refPayments);

				if (_refPayments > 0) {
					this.accessDirCustomData(function(err, dirr) {
						if (err) { return log.info(err) }

						dirr.customData.payments.refDebt += _refPayments;
						dirr.customData.save(function(err) {
						    if (err) throw new Error(err);
							log.info('Referal debt is stored succesfuly\n');
						});
					});
				}
			}

			this.eachAccount(function(account, cb) {
				if (account.customData && account.customData.refPayment) {
					var _needToPay = false;

					for (key in account.customData.refPayment) {
						var _unpayed = _getUnpayedRefPayments(account.customData.refPayment[key]);

						if(_unpayed) {
							_needToPay || (_needToPay = {});
							_needToPay[key] = _unpayed;
						}
					}

					if(_needToPay) {
						var _processed = payUnpayedRefPayments(account, _needToPay);

						if (_processed)	{
							_processed.account.customData.save(function(err) {
								if (err) { 
									log.info(err);
								    log.info('unable to update referrer data');
								} else {
								    log.info('referrer data updated');
									_refPayments += _processed.payouts;

									cb();
								}
							});
						} else {
							throw new Error('Something went wrong with the refPayments processing')
						}							
					} else {
						cb();
					}
				} else {
					cb();
				}
			}, _onProccessEnd.bind(this));
		}),

		updatePaymentStatistic : function(payReq, mail, payId) {
			var _payerMail = mail;
			var _payerHash = makeHashForEmail(mail);
			var _payReq = payReq;

			return new Vow.Promise(DL('run', 'layer', 'finance')(function(resolve, reject, notify) {
				this.accessDirCustomData(function(err, dirr) {
					if (err) { reject(err) }

					if (dirr) {
						dirr.getCustomData(function(err, customData) {
							if (err) { reject(err) }

							var _payDate = Date.now();

							customData.payments || (customData.payments = {});
							customData.payments.byUser || (customData.payments.byUser = {});
							customData.payments.byUser[_payerHash] || (customData.payments.byUser[_payerHash] = []);
							
							customData.payments.byUser[_payerHash].push({ 
								email : _payerMail, 
								amount : _payReq.sum, 
								payDate : _payDate, 
								transactionId : payId, 
								status : 'payed' 
							});

							if(_payReq.payMethod && _payReq.payMethod === 'fromBalance') {
								customData.payments.payouts || (customData.payments.payouts = []);
								customData.payments.payouts.push({ 
									amount : _payReq.sum, 
									payDate : _payDate, 
									transactionId : payId, 
									method : 'buy', 
									status : 'payed' 
								});

								customData.payments.refDebt || (customData.payments.refDebt = 0);
								customData.payments.refDebt = Number(customData.payments.refDebt) - Number(_payReq.sum);
							} else {
								customData.payments.incoming || (customData.payments.incoming = []);
								
								customData.payments.incoming.push({ 
									amount : _payReq.sum, 
									payDate : _payDate, 
									transactionId : payId, 
									status : 'payed' 
								});

								customData.balance || (customData.balance = 0);
								customData.balance = Number(customData.balance) + Number(_payReq.sum);
							}
												
							customData.statistics || (customData.statistics = {});
							customData.statistics.transactions || (customData.statistics.transactions = {});
							customData.statistics.transactions[payId] = { transaction : _payReq, payerHash : _payerHash, payDate : _payDate };

							customData.save(function(err) {
							    if (err) reject(err);

							    log.info('transaction data is stored in dir');
							    resolve('transaction data is stored in dir');
							});
						});
					} else {
						reject('Unable to get dir customData');
					}
				});
			}));
		},

		// pay confirmation request
		confirmPayRequest : function(href, payId) {
			return new Vow.Promise(DL('run', 'dir')(function(resolve, reject, notify) {
				var _href = href;
				var _payId = payId;

				log.verbose('Updating payment data');
				
				this.getAccountByUrl(_href, function(err, account) {
				    if (err) { return reject(err); };
					if(!account) { return reject('Unable to get payer account'); }

					var _payerMail = account.email;
					
					account.getCustomData(function(err, customData) {
					    if (err) { return reject(err); }
				
						var payId = _payId;

						if (customData && customData.payRequest && customData.payRequest.date) {
							if (makeHashForEmail(customData.payRequest.date + '') === payId) {
								if (customData.payRequest.endDate && customData.payRequest.sum) {
									var _payReq = customData.payRequest;
									var _payerHash = customData.hash;
									var _dir = this.getCustomData();
									var _que = [];

									function storePayerData(customData) {
										return new Vow.Promise(function(resolve, reject, notify) {
											customData.template = customData.payRequest.subscription;
											customData.payed = 'active';
											
											customData.dates || (customData.dates = {});
											customData.dates.payedFrom = Date.now();
											customData.dates.payedUntil = Number(_payReq.endDate) + (Date.now() - Number(_payReq.date));
											
											customData.statistic || (customData.statistic = {});
											customData.statistic.lastPayment = _payReq;

											if (_payReq.payMethod && _payReq.payMethod === 'fromBalance') {
												customData.balance = (Number(customData.balance) - Number(_payReq.sum));
											}
											
											// the end
											customData.remove('payRequest');
										
											customData.save(function(err) {
												if (err) reject(err);
											    log.info('payer data updated');
												resolve('done');
											});
										})
									}

									var _payer = storePayerData(customData).then(noop, function(err) {
											return reject(err);
										});

									_que.push(_payer);

									_que.push(procedures.updatePaymentStatistic(_payReq, _payerMail, payId).then(noop, function(err) { return reject(err); }));

									if (customData.referrer && this.getCustomData().refProgram && this.getCustomData().refProgram.firstRef && _payReq.payMethod !== 'fromBalance') {
										function updateReferrerPayouts(url) {
											return new Vow.Promise(DL('run', 'dir')(function(resolve, reject, notify) {
												this.getAccountByUrl(url, function(err, account) {
													if (err) { return reject(err); }

													if (account) {
														account.getCustomData(DL('run', 'dir')(function(err, customData) {
															log.info('updating referrer data');

															customData.refPayment || (customData.refPayment = {});
															customData.refPayment[_payerHash] || (customData.refPayment[_payerHash] = []);
															
															customData.refPayment[_payerHash].push({ 
																amount : ((this.getCustomData().refProgram.firstRef * Number(_payReq.sum)) / 100), 
																payDate : Date.now(), 
																transactionId : payId, 
																status : 'not-payed' 
															});

															customData.save(function(err) {
															    if (err) { return reject(err); }

															    log.info('referrer payouts updated');
															    resolve('referrer payouts updated');
															});
														}));
													} else {
														return reject('Unable to get referrer account');
													}
												});
											}));
										}

										var _ref = this.getAccountByHash(customData.referrer);
										_ref && _que.push(updateReferrerPayouts(_ref.href).then(noop, function(err) { return reject(err); }));
									}

									Vow.all(_que)
									    .then(function(result) {
											return resolve('All done');
										}, function(err) {
											return reject(err);
										});
								} else {
									return reject('Corrupted pay request data. Please, make a new request');
								}
							} else {
								return reject('Unable to verify transaction data');
							}
						} else {
							return reject('Unable to get user data for transaction');
						}
					}.bind(this));
				}.bind(this));
			}));
		},

		sendResetPassEmail : function(mail) {
			return new Vow.Promise(DL('run', 'dir')(function(resolve, reject, notify) {
				this.getProviders().app(function(err, app) {
					if (err) { return reject(err); };

					var _username = process.env['STORMPATH_API_KEY_ID'],
						_password = process.env['STORMPATH_API_KEY_SECRET'];

					request.post({ url : app.passwordResetTokens.href, json : true, body : { email : mail }, 'auth': { 'user': _username, 'pass': _password, 'sendImmediately': false } }, 
						function (error, response, body) {
						if (error) { return reject(error) }
						
						if (response.statusCode === 200) {
							return resolve('done');
						} else {
							log.error('Error while sending reset password Email', response.body);
							return reject(response.body);
						}
					});
				});
			}));
		},

		verifyPassResetToken : function(token) {
			return new Vow.Promise(DL('run', 'dir')(function(resolve, reject, notify) {
				this.getProviders().app(function(err, app) {
					if (err) { return reject(err); };

					app.verifyPasswordResetToken(sptoken, function(err, verificationResponse) {
						if (err) { return reject(err) }

					    spClient.getAccount(verificationResponse.account.href, function(err, account) {
					    	return resolve(account);
					    });
					});
				});
			}));
		},
		
		resetUserPass : function(password, token) {
			return new Vow.Promise(DL('run', 'dir')(function(resolve, reject, notify) {
				this.getProviders().app(function(err, app) {
					if (err) { return reject(err); }

					app.resetPassword(token, password, function(err, result) {
						if (err) {
							// The token has been used or is expired, have user request a new token
							log.error(err);
							return reject(err);
						}

						return resolve('done');
					});
				});
			}));
		},

		verifyMailConfirmationToken : function(token) {
			return new Vow.Promise(DL('run', 'dir')(function(resolve, reject, notify) {
				var _username = process.env['STORMPATH_API_KEY_ID'],
					_password = process.env['STORMPATH_API_KEY_SECRET'],
					_url = 'https://api.stormpath.com/v1/accounts/emailVerificationTokens/';


				request.post({ url : _url + token, 'auth': { 'user': _username, 'pass': _password, 'sendImmediately': false }}, 
					function (error, response, body) {
						if (error) { return reject(error) }

						if (response.statusCode === 200) {
							return resolve('Token is valid');
						} else {
							return reject('Unable to verify email')
						}
					}
				);
			}));
		},

		registerUserByEmail : function(email, password, referrer) {
			// Grab our app, then attempt to create this user's account.
			return new Vow.Promise(DL('run', 'dir')(function(resolve, reject, notify) {
				var app = this.getProviders().app(function(err, app) {
					if (err) { throw err; }

					app.createAccount({
						givenName: 'null',
						surname: 'null',
						username:  'smartuser' + Date.now(),
						email: email,
						password: password,
						customData : {
							phone : null,
							template : null,
							payed : null,
							bonus : null,
							billing : null,
							hash : makeHashForEmail(email),
							referrer : referrer ? referrer : null,
							payDates: null
						}
					},

					DL('run', 'dir')(function (err, createdAccount) {
						if (err) {
							var _message;

							log.error('Error registering new account', err);
							for (code in this.getMessages().errors.apiCodes) {
								if(code == err.code + '') {
									_message = this.getMessages().errors.apiCodes[code];
									break
								}
							}

							_message || (_message = err.userMessage);

							return reject(_message);
						}

						this.updateAccount(createdAccount);

						// ref program registration
						var _email = email;

						if(referrer) {
							log.info('Account registered with referrer %s', referrer);
							var _referrer = this.getAccountByHash(referrer);

							_referrer && this.getAccountByUrl(_referrer.href, function(err, account) {
								account && account.getCustomData(function(err, customData) {
									log.info('updating referrer data');
									customData.referredAccounts || (customData.referredAccounts = {});
									customData.referredAccounts[makeHashForEmail(_email)] = _email;

									customData.save(function(err) {
									    if (err) { return reject(err); }
									});
								});
							});
						};

						resolve('Done');
					}));
				});
			}));
		},

		getUserByUsernameAsync : function(name) {
			return new Vow.Promise(DL('run', 'dir')(function(resolve, reject, notify) {
				if (typeof name !== 'string') {
					return reject('You should provide the name string to get user')
				}

				function _getAcc(err, account) {
					log.info('Getting account');

					if (err) {
						log.error('Failed to get account', err);
						return reject(err);
					} else {
						log.info('Success!');
						return resolve(account);
					}
				}

				function _checkName(result) {
					log.info('Checking name');

					if (!result) {
						return reject('username not found')
					}

					this.getAccountByUrl(result.href, _getAcc);
				}

				this.getUsers(function() {
					this.getAccountByUsername(name, _checkName);
				});
			}));
		}
	};

	DL.proc = procedures;

	return DL
}

module.exports = addProc;
