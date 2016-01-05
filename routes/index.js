var express = require('express');
var router = express.Router();
var passport = require('passport');
var stormpath = require('stormpath');
var request = require('request');
var Vow = require('../libs/bem-core/common.blocks/vow/vow.vanilla');
var multer  = require('multer');
var crypto = require('crypto');
var fs = require('fs');
var undef;
var dir;
var GRP;
var DL;

console.log(Vow);
var uploader = multer({ 
	dest : './photos/',

	rename : function(fieldname, filename) {
			return filename;
	},

	limits : {
		fileSize : 5242880  
	},

	fileFilter : function(req, file, cb) {
		var _oldFile = file.originalname;
		
		_oldFile = _oldFile.split('.');
		var _ext = _oldFile[_oldFile.length - 1];


		if(_ext !== 'png' && _ext !== 'jpg' && _ext !== 'bmp' && _ext !== 'gif') {
			req.flash('error', dir.messages.errors.unsupported);

			cb(null, false);
		} else {
			cb(null, true);
		}
	},

	onFileUploadStart: function (file) {
		console.log(file.originalname + ' is starting ...\n');
	},

	onFileUploadComplete: function (file) {
		console.log(file.fieldname + ' uploaded to  ' + file.path);
		done=true;
	}
}).single('avatar');



// Initialize our Stormpath client.
var dirUrl = 'https://api.stormpath.com/v1/directories/14CzfxWB2inuWwRi8tIZ8y';
var apiKey = new stormpath.ApiKey(
	process.env['STORMPATH_API_KEY_ID'],
	process.env['STORMPATH_API_KEY_SECRET']
);

var spClient = new stormpath.Client({ apiKey: apiKey });

var hasOwnProp = Object.prototype.hasOwnProperty;

function extend(target, source) {
	(typeof target !== 'object' || target === null) && (target = {});

	for(var i = 1, len = arguments.length; i < len; i++) {
		var obj = arguments[i];

		if(obj) {
			for(var key in obj) {
					hasOwnProp.call(obj, key) && (target[key] = obj[key]);
			}
		}
	}

	return target;
};

function stringifyToQuery(obj) {

    function addParam(res, name, val) {
        /* jshint eqnull: true */
        res.push(encodeURIComponent(name) + '=' + (val == null? '' : encodeURIComponent(val)));
    }

    return Object.keys(obj)
        .reduce(
            function(res, name) {
                var val = obj[name];
                Array.isArray(val)?
                    val.forEach(function(val) {
                        addParam(res, name, val);
                    }) :
                    addParam(res, name, val);
                return res;
            },
            [])
        .join('&');
}

function makeRefLink(param, base, email) {
	if(param, base, email) {
		var obj = {};
		obj[param] = crypto.createHash('sha1').update(email).digest("hex");
		return base + '?' + stringifyToQuery(obj);
	} else {
		return ''
	}
}

function makeHashForEmail(email) {
	return crypto.createHash('sha1').update(email).digest("hex");
}


// @param 
// group {String} A group name for merge
// property {String}|{Array[{Strings}]} The string value allows one to merge a top level group of properties. Also it is possible to pass an array of field names, to merge the nested

function getMergedProperty(group, base, property) {
	var _store = base;
	var _common = group;
	var _obj = {};

	console.log(_common);
	console.log('\n\n\n\n' + _store);

	if(!_store || !property) { return null } 
		else if(typeof property === 'object' && property.length) { 

		property.forEach(function(level) {
			if(typeof _store !== 'undefined'){
				(_store = _store[level]);
				(_common = _common[level]);
			}
		});

		if (typeof _store !== 'undefined') {
			typeof _common !== 'undefined' ? 
				(_obj = extend({}, _common, _store)) : 
					(_obj = extend({}, _store));
		}

	} else {
		if(_store[property] !== 'undefined') {
			_common[property] !== 'undefined' ? 
				(_obj = extend({}, _common[property], _store[property])) : 
					(_obj = extend({}, _store[property]));
		} else {
			_obj = null;
		}
	}

	return _obj
}


function isProfileFiled (user) {
	return user.username !== 'null' && user.givenName  !== 'null' && user.surname !== 'null';
}



var setingsStorage = { common : false };
var endpointCallbacks = {
	login : function(endpoint, messages, extra) {
		router.get(endpoint.url, function(req, res, next) {
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

		console.log('Enabling login routes');

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

	register : function(endpoint, messages, extra) {
		console.log('Enabling registration routes');

		// Render the registration page.
		router.get(endpoint.url, function(req, res) {
			res.render('enter', {
				block : 'enter',
				bundle : 'enter',
				error : req.flash('error')[0],
				info : req.flash('info'),
				caption : messages.info.passwordAlert,

				firstInput: {
					name : endpoint.firstInputName,
					placeholder : messages.email
				},
				secondInput: {
					name : endpoint.secondInputName,
					placeholder : messages.password
				},

				title : messages.register
			});
		});
	}
};

function registerEndPoints (endpoints, msg) {
	for (point in endpoints) {
		if(!!endpointCallbacks[point]) {
			endpointCallbacks[point](endpoints[point], msg);
		}
	}
}

var funcGroupTypesCb = {
	filter : function(fGroup, params, cb) {
		console.log(fGroup);
		console.log(params.criteria);

		if(!params.criteria) {
			return console.error('filter criteria must be provided');
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
							console.log(results);
							cb && cb(results);
						});
					});
				} else {
					this.dirAccounts(function(err, accounts) {
						accounts.filter(function(application, callback) {
							callback(!!application[params.criteria.field]);
						}, function(results) {
							console.log(results);
							cb && cb(results);
						});
					});
				}

			}
		} else {
			console.log('dataLayer is unsupported by filter');
		}

	}
};

var dataProviders = {
	accountByUrl : function(url, callback) {
		spClient.getAccount(url, { expand: 'customData' }, callback);
	},

	groups : function(callback) {
		spClient.getDirectory(dirUrl, { expand: 'customData' }, function(err, directory) {
			if (err) callback(new Error(err));
			
			directory.getGroups({ expand: 'customData' }, function(err, groups) {
				if (err) callback(new Error(err));
					callback(null, groups);
			});
		});
	},
	
	group : function(callback, url) {
		spClient.group(url, { expand: 'customData' }, callback);
	},

	getGroupCustomData : function(callback, url) {
		spClient.group(url, { expand: 'accounts' }, function(err, group) {
			if (err) callback(new Error(err));
			console.log('Getting group CustomData');
			callback(null, group.customData);
		});
	},

	groupAccounts : function(callback, url) {
		spClient.group(url, { expand: 'accounts' }, callback);
	},

	dir : function(callback) {
		spClient.getDirectory(dirUrl, { expand: 'customData' }, callback);
	},

	getDirCustomData : function(callback) {
		spClient.getDirectory(dirUrl, { expand: 'customData' }, function(err, dirr) {
			if (err) callback(new Error(err));

			callback(null, dirr.customData);
		})
	},

	dirAccounts : function(searchObj, callback) {
		spClient.getDirectory(dirUrl, { expand: 'customData' }, function(err, dirr) {
			if (err) callback(new Error(err));
			if(callback) {
				dirr.getAccounts(searchObj, callback);
			} else {
				callback = searchObj;
				dirr.getAccounts(callback);
			}
		})
	},

	eachAccount : function(callback, endCb, searchObj) {
		dataProviders.dirAccounts(searchObj ? searchObj : { expand: 'customData' }, function(err, accounts) {
			if (err) callback(new Error(err));
			accounts.each(callback, endCb);
		})
	},

	// function isAppContainsTest (application, cb) {
	//   cb(crypto.createHash('sha1').update(application.email).digest("hex") === crypto.createHash('sha1').update('murdalay@gmail.com').digest("hex"));
	// }

	detectAccounts : function(searchObj, callback) {
		dataProviders.dirAccounts(function(err, accounts) {  
			accounts.detect(searchObj, function(result){
				callback(result);
			})
		})
	}
};

var DlPreInitFunctions = {
	dir : function(callback, name) {
		spClient.getDirectory(dirUrl, { expand: 'customData' }, function(err, dirr) {
			if (err) throw new Error(err);
			console.log('\ngetting dir ' + name)
			var _dir = {};

			dir = dirr.customData;

			for(key in dir) {
				if(dir.hasOwnProperty(key)) {
					_dir[key] = dir[key];
				}
			}
			dir = _dir;

			setingsStorage.common = _dir;
			
			console.log('dirs data Source is inited\n');
			return callback(null, name, dirr, 'dir');
		});
	},
	groups : function (callback, name) {
		spClient.getDirectory(dirUrl, { expand: 'customData' }, function(err, directory) {
			if (err) throw new Error(err);
			
			console.log('\ngetting group ' + name)
			
			directory.getGroups({ expand: 'customData' }, function(err, groups) {
				groups.each(function(group, cb) {
					callback(null, group.name, group, 'groups');
					cb()
				}, 

				function(err, ress) {
				});
			});
		});
	}
};


function passFieldToCb(launchlist, cb) {
	for (key in launchlist) {
		if(launchlist.hasOwnProperty(key)){
			cb(launchlist[key], key);
		}
	}
}

DL = function() {
	var data = { accounts : {}, dir : {}, groups : {} };
	var providers = {};
	var components = {};
	var groups = {};
	var fGroupTypesCb = {};
	var layers = {};

	function _getActiveDataProviders(res, key) {
		providers[key] = res;
		console.log('registring data provide ' + key)
	}

	function _getFuncGroupTypesCb(res, key) {
		fGroupTypesCb[key] = res;
		console.log('registring callbacks for functional Group type ' + key)
	}

	function getAccounts (query, cb) {
		return providers.dirAccounts(query, cb);
	}

	function updateAccount(acc, cb) {
		data.accounts[makeHashForEmail(acc.email)] = extend({}, acc);
		cb()
	}

	function updateAccounts(endCb) {
		providers.eachAccount(updateAccount, endCb.bind(this));
	}

updateAccounts.bind(this);

	function registerDir(name, dir) {	
		data.dir = extend({}, data.dir, dir);
		layers[name] = extend(layers[name], dir);
		console.log('dir ', ' registred\n\n');
	}

	function registerGroup(name, group) {
		groups[name] = extend(null, { url : group.href, name: name }, group);
		groups[name].customData.mergedMessages = extend({}, data.dir.customData.messages, groups[name].customData.messages);
		console.log('grop ' + name + ' registred\n\n');
	}

	function initPages(cb) {
		var _pages = this.getPages();
		var _paths = this.getPaths(); 
		var _components = this.getFuncComponents(); 
		var _fGroups = this.getFuncGroups(); 
		var _header = { basePath : _paths.basePath, items : [] };

		function _initPage(item) {
			var fGroups = [];

			for (key in item.fGroups) {
				fGroups.push({ fGroup : _fGroups[key], params : item.fGroups[key] });
			}

			_header.items.push({ value : item.id, title : item.title });

			var _ext = { 
				name : item.id,
				title : item.title,
				bundle : item.bundle,
				template : item.template,
				fGroups : fGroups,
				header : _header,
				page : item,

				getName : function() { return this.name },
				getPage : function() { return this.page },
				getFuncGroups : function() { return this.fGroups },
				initFuncGroups : function(cb) {
					var _grp = this.getFuncGroups();
					var _grpPromises = [];

					_grp.length && _grp.forEach(function(item){
						var _cb = fGroupTypesCb[item.fGroup.type];
						var _promise = new Vow.Promise(function(resolve, reject, notify) {
							function getDataForfGroup(result) {
								if(!!groupBemjson) {
									var _bJson = groupBemjson; 
									_bJson.data = result;
									resolve(_bJson);

								} else {
									resolve(result);
								}
							}

							if(!!item.fGroup.block) {
								var groupBemjson = { block : item.fGroup.block }
								if(!!_cb) {
									groupBemjson.data = _cb.apply(this, [item.fGroup, item.params, getDataForfGroup]);
								} else {
									resolve(groupBemjson);
								}
							} else {
								var groupBemjson = false;
								_cb && _cb.apply(this, [item.fGroup, item.params, getDataForfGroup]);
							}
					    });

						_grpPromises.push(_promise);

					});

					Vow.all(_grpPromises)
					    .then(cb.bind(this));
				},

				getBundle : function() { return this.bundle },
				getTemplate : function() { return this.template },
				getTitle : function() { return this.title },
				getHeader : function() { return this.header }
			}; 
			
			cb.bind(extend({}, this, _ext))()
		}

		_initPage.bind(this)
		_pages.forEach(_initPage);
	}


	passFieldToCb(dataProviders, _getActiveDataProviders);
	passFieldToCb(funcGroupTypesCb, _getFuncGroupTypesCb);
	console.log('DL is created');


	// global setters
	return function(action, layer, name) {
		console.log('Creating data layer ');

		function getGroup(cb) {
			this.getName = function() {
				return this.name;
			}
			this.getMessages = function() {
				return groups[name].customData.mergedMessages;
			}
			this.getPages = function() {
				return groups[name].customData.Pages;
			}
			this.getEndpoints = function() {
				return groups[name].customData.Endpoints;
			}				
			this.getUrl = function() {
				return groups[name].customData.url;
			}
			this.getFuncComponents = function() {
				return this.fComponents;
			}
			this.getFuncGroups = function() {
				return this.fGroups;
			}
			this.getProviders = function() {
				return providers;
			}
			this.initPages = initPages.bind(this);
			this.dirAccounts = providers.dirAccounts.bind(this);

			this.getCustomData = function() {
				return groups[name].customData;
			}
			this.getPaths = function() {
				var _cd = getCustomData();
				return _cd.PATHS;
			};	

			this.name = groups[name].name;
			this.messages = groups[name].customData.messages;
			this.providers = providers;
			this.url = groups[name].url;
			this.data = groups[name].customData;
			this.Endpoints = groups[name].customData.Endpoints;
			this.fComponents = groups[name].customData.functionalComponents;
			this.fGroups = groups[name].customData.functionalGroups;
			this.Pages = groups[name].customData.Pages;

			return cb.bind(this)();
		}

		function getDir(cb) {
			this.getName = function() {
				return data.dir.name;
			};
			this.getPages = function() {
				return data.dir.customData.Pages;
			};
			this.getEndpoints = function() {
				return data.dir.customData.Endpoints;
			};				
			this.getUrl = function() {
				return data.dir.customData.url;
			};
			this.getAccountByHash = function(hash) {
				console.log(hash);
				return data.accounts[hash] ? data.accounts[hash] : null;
			};
			this.getAccountByUrl = function(url, cb) {
				return providers.accountByUrl(url, cb)
			};
			this.getProviders = function() {
				return providers;
			};
			this.getGroups = function() {
				return groups;
			};
			this.getMessages = function() {
				return data.dir.customData.messages;
			};
			this.getPaths = function() {
				return data.dir.customData.PATHS;
			};
			this.getCustomData = function() {
				return data.dir.customData;
			};
			this.getAccounts = function(query, cb) {
				return providers.dirAccounts(query, cb);
			};
			this.accessDirCustomData = function(callback) {
				return providers.dir(callback);
			};
			this.eachAccount = function(cb, endCb, query) {
				return providers.eachAccount(cb, endCb, query);
			};			
			this.updateAccounts = updateAccounts;

			this.name = data.dir.name;

			return cb.bind(this)();
		}
		

		if (action === 'set') {
			if(layer === 'group') {
				return registerGroup
			} else if (layer === 'dir') {
				return registerDir
			}
		}

		if (action === 'get') {
			if(layer === 'group') {
				return getGroup
			} else if (layer === 'dir') {
				return getDir
			}
		}
	}
}();



var DLmap = {
	self : ['dir'],
	users : ['groups']
};

function literalMethodsLauncher(methods, launchlist, iterator, cb) {
	var lData = {};
	var _launched = {};
	var _listIsProccesed = false;
	var _counter = 0;
	var _initOver = 0;

	var initCallback = function(err, name, data, layer) {
		if (err) { cb(err) }

		lData[layer] = data;
		_initOver += 1;
		iterator(err, name, data, layer);

		if(_listIsProccesed) {
			_counter > _initOver || cb(null, lData);
		}
	};

	if (typeof launchlist === 'object') {
		if(launchlist.length) {
			launchlist.forEach(function(key) {
				if(!_launched[key] && methods[key]) {
					_launched[key] = true;
					_counter += 1;
					methods[key](initCallback, key);
				} 
			});
		} else {
			for (key in launchlist) {
				if(!_launched[key] && methods[key]) {
					_launched[key] = true;
					_counter += 1;
					methods[key](initCallback);
				} else if (typeof launchlist[key] === 'object' && launchlist[key].length) {
					launchlist[key].forEach(function(key) {
						if(!_launched[key] && methods[key]) {
							_launched[key] = true;
							_counter += 1;
							methods[key](initCallback, key);
						} 
					});
				}
			}
		}
	_listIsProccesed = true;
	} else {
		cb(new Error('literal or array must be provided as a list of methods'));
	}

}

function initDataLayers() {
	function registerBasics(err, name, data, type) {
		if(err) { throw new Error('basic data layer initialization problem'); }

		if(type === 'dir') {
			DL('set', 'dir')(name, data);
		} else if(type === 'groups') {
			DL('set', 'group')(name, data);
		}
	}
	
	function onInit(err, data) {
		if(err) {  throw new Error('Error initing basic data layers') };
		console.dir('WOW!');

		DL('get', 'dir')(function() { 
			console.log(this.getEndpoints());

			registerEndPoints(this.getEndpoints(), this.getMessages())
			this.updateAccounts(function(err) {  });
		});

		DL('get', 'dir', 'editors')(function() {
					
			var grpoups = this.getGroups();
			
			for (name in grpoups) {
				DL('get', 'group', name)(function() { 
					function verifyGroupAccess(req, res, next) {
						if (!req.user || req.user.status !== 'ENABLED') {
							req.flash('error', 'Какая-то бодяга с авторизацией (');
							return res.redirect('/useradmin');
						}

						if (!req.user.groups || !req.user.groups[this.getName()]) {
							spClient.getAccount(req.user.href, { expand: 'customData' }, function(err, account) {
									account.getGroups({ name: this.getName() }, 
										function(err, groups) {
											groups.each(function(group, cb) {
												if (group) {
													var _name = group.name;

													req.user.groups || (req.user.groups = {});
													req.user.groups = extend(req.user.groups, { _name : true });
													return next()
												}

												cb();
												},
												function(err) {
													if (err) {
														req.flash(err);
													}
													req.flash('error', 'Печалька, но вы не админ (');
													return res.redirect('back');
												}
											);
										} 
									);
								}
							)
						} else {
							return next()
						}
					}
					//TODO : remove active
					function displayPage(req, res, next) {
						this.initFuncGroups(function(data) {
							res.render(this.getBundle(), {
								block : this.getTemplate(),
								error : req.flash('error'),
								info : req.flash('info'),
								appData : dir,
								menu : this.getHeader(),
								title : this.getTitle(),
								helpers : { makeHashForString : makeHashForEmail },
								messages : this.getMessages(),
								active : [ true, true, false, false ],
								bundle : this.getBundle(),
								inside: data
							});
						});
					}

					registerEndPoints(this.getEndpoints(), this.getMessages());

					this.initPages(function() { 
						// this.initFuncGroups();
						// console.log(this.getFuncGroups()) 
						// console.log(this.getName()) 
						// console.log(this.getPage()) 
						// console.log(this.getTemplate()) 
						// console.log(this.getTitle()) 
						// console.log(this.getHeader()) 
						// console.log(this.getPaths().basePath) 

						router.get(this.getPaths().basePath + '/' + this.getName(), verifyGroupAccess, displayPage.bind(this));


					});



					// admin dashboard
					// router.get('/useradmin/home', verifyGroupAccess, function(req, res, next) {
					// 	this.dirAccounts({ expand:'customData' }, function(err, accounts) {
					// 		accounts.filter(function(application, callback) {
					// 			application.getCustomData(function(err, customData) {
					// 				//filter
					// 				callback(!!customData.payRequest);
					// 			});

					// 		}, function(results) {
					// 			console.log(results);

					// 			res.render('admin', {
					// 				block : 'container',
					// 				error : req.flash('error'),
					// 				info : req.flash('info'),
					// 				menu : dir.menuUserAdmin,
					// 				messages : this.getMessages(),
					// 				active : [ true, true, false, false ],
					// 				bundle : 'admin',
					// 				inside: [
					// 					{
					// 						block : 'adm-payrequests',
					// 						appData : dir,
					// 						accounts : results
					// 					}
					// 				]
					// 			});
					// 		});
					// 	});
					// });
				});
			}
		});
	}

	literalMethodsLauncher(DlPreInitFunctions, DLmap, registerBasics, onInit);
}

// start all thing
initDataLayers();

//// end of Data Layer section ////

function setCookieByNameFromQueryParams(name) {
	return function (req, res, next) {
		var val = req.query[name];

		// check if client sent cookie
		if(val) {
			var cookie = req.cookies[name];
			if (cookie === undefined) {
				res.cookie(name, val, { maxAge: 9000000, httpOnly: true });
				console.log('cookie created successfully');
			} 
			else { console.log('cookie exists', cookie); } 
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
				console.log('cookie created successfully');
			} else { 
				console.log('cookie exists', cookie); 
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




// Render the registration page.
router.get('/register', setCookieByNameFromQueryParams('ref_id'), function(req, res) {
	res.render('enter', {
		block : 'enter',
		bundle : 'enter',
		caption : dir.messages.info.passwordAlert,
		error : req.flash('error')[0],
		info : req.flash('info'),

		firstInput: {
			name : 'email',
			placeholder : dir.messages.email
		},
		secondInput: {
			name : 'password',
			placeholder : dir.messages.password
		},

		title : dir.messages.register
	});
});




// Register a new user to Stormpath.
router.post('/register', function(req, res) {

	var email = req.body.email;
	var password = req.body.password;

	// Grab user fields.
	if (!email || !password) {
		return res.redirect('/reg-error-nodata.html');
	}

	var _mailRegexp = /^([a-z0-9_-]+\.)*[a-z0-9_-]+@[a-z0-9_-]+(\.[a-z0-9_-]+)*\.[a-z]{2,6}$/;

	var _isMail = _mailRegexp.test(email);

	if(!_isMail) {
		req.flash('error', dir.messages.errors.notMail);
		return res.redirect('/register');
	}


	// Grab our app, then attempt to create this user's account.
	var app = spClient.getApplication(process.env['STORMPATH_APP_HREF'], function(err, app) {
		if (err) throw err;

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
				referrer : req.cookies['ref_id'] ? req.cookies['ref_id'] : null,
				payDates: null,
				social: {}
			}
		},

		function (err, createdAccount) {
			if (err) {
				var _message;

				console.error(err);
				for (code in dir.messages.errors.apiCodes) {
					if(code == err.code + '') {
						_message = dir.messages.errors.apiCodes[code];
						break
					}
				}

				_message || (_message = err.userMessage);

				req.flash('error', _message);
				return res.redirect('/register');

			} else {
				// ref program registration
				var _email = email;
				var _ref = req.cookies['ref_id'] ? req.cookies['ref_id'] : null

				_ref && DL('get', 'dir')(function() { 
					var _referrer = this.getAccountByHash(_ref);
					_referrer && this.getAccountByUrl(_referrer.href, function(err, account) {
						account && account.getCustomData(function(err, customData) {
							console.log('updating referrer data');
							customData.referredAccounts || (customData.referredAccounts = {});
							customData.referredAccounts[makeHashForEmail(_email)] = _email;

							customData.save(function(err) {
							    if (err) next(err);
							});
						});
					})
				});

				return res.redirect('/success.html');
			}
		});
	});
});


router.get('/verify/', function(req, res, next) {
	var _username = process.env['STORMPATH_API_KEY_ID'],
			_password = process.env['STORMPATH_API_KEY_SECRET'],
			_url = 'https://api.stormpath.com/v1/accounts/emailVerificationTokens/';


	request.post({ url : _url + req.query.sptoken, 'auth': { 'user': _username, 'pass': _password, 'sendImmediately': false }}, 
		function (error, response, body) {
		if (error) { return next(error) }
		if (response.statusCode === 200) {
			req.flash('info', dir.messages.verifySuccess);
			return res.redirect('/login');
		} else {
			return res.redirect('/reg-error.html')
		}
	});
});

// pay confirmation request

DL('get', 'dir')(function() { 
	function confirmPayRequest(href, payId) {
		return new Vow.Promise(function(resolve, reject, notify) {
			console.log('updating payment data');

			this.getAccountByUrl(href, function(err, account) {
				account || reject('Unable to get payer account');

				var _payerMail = account.email;
				
				account.getCustomData(function(err, customData) {
				    if (err) reject(err);

					if (customData && customData.payRequest && customData.payRequest.date) {
						if (makeHashForEmail(customData.payRequest.date + '') === payId) {
							if (customData.payRequest.endDate && customData.payRequest.sum) {
								var _payReq = customData.payRequest;
								var _payerHash = customData.hash;
								var _dir = this.getCustomData();
								var _que = [];


								function updatePaymentStatistic() {
									var _payerMail = _payerMail;
									return new Vow.Promise(function(resolve, reject, notify) {
										this.accessDirCustomData(function(err, dirr) {
											if (err) { reject(err) }

											if (dirr) {
												dirr.getCustomData(function(err, customData) {
													if (err) { reject(err) }
													  console.log(customData);

													customData.payments || (customData.payments = {});
													customData.payments.byUser || (customData.payments.byUser = {});
													customData.payments.byUser[_payerHash] || (customData.payments.byUser[_payerHash] = []);
													
													customData.payments.byUser[_payerHash].push({ 
														email : _payerMail, 
														amount : _payReq.sum, 
														payDate : Date.now(), 
														transactionId : payId, 
														status : 'payed' 
													});
																		
													customData.payments.incoming || (customData.payments.incoming = []);
													customData.payments.incoming.push({ 
														amount : _payReq.sum, 
														transactionId : payId, 
														status : 'payed' 
													});

													customData.statistics || (customData.statistics = {});
													customData.statistics.transactions || (customData.statistics.transactions = {});
													customData.statistics.transactions[payId] = { transaction : _payReq, payerHash : _payerHash };

													customData.save(function(err) {
													    if (err) reject(err);
													    resolve('transaction data stored in dir');
													});
												});
											} else {
												reject('Unable to get dir customData');
											}
										});
									});
								}

								_que.push(updatePaymentStatistic().then(function() {}, function(err) {
										reject(err);
									})
								);

								if (customData.referrer && _dir.refProgram && _dir.refProgram.firstRef) {
									console.log('URURURUURURURURR\n\n\n\n\n\n')
									function updateReferrerPayouts(url) {
										return new Vow.Promise(function(resolve, reject, notify) {
											this.getAccountByUrl(url, function(err, account) {
												if (err) { reject(err) }

												if (account) {
													account.getCustomData(function(err, customData) {
														console.log('updating referrer data');

														customData.refPayment || (customData.refPayment = {});
														customData.refPayment[_payerHash] || (customData.refPayment[_payerHash] = []);
														
														customData.refPayment[_payerHash].push({ 
															amount : ((_dir.refProgram.firstRef * _payReq.sum) / 100), 
															payDate : Date.now(), 
															transactionId : payId, 
															status : 'not-payed' 
														});

														customData.save(function(err) {
														    if (err) reject(err);
														    resolve('referrer payouts updated');
														});
													});
												} else {
													reject('Unable to get referrer account');
												}
											});
										});
									}

									var _ref = this.getAccountByHash(customData.referrer);

									_ref && _que.push(updateReferrerPayouts(_ref.href).then(function() {}, function(err) {
										reject(err);
									}));
								}

								customData.template = customData.payRequest.subscription;
								customData.payed = 'active';
								
								customData.dates || (customData.dates = {});
								customData.dates.payedFrom = Date.now();
								customData.dates.payedUntil = Number(_payReq.endDate) + (Date.now() - Number(_payReq.date));
								
								customData.statistic || (customData.statistic = {});
								customData.statistic.lastPayment = _payReq;
								
								// the end
								customData.remove('payRequest');

								function storePayerData() {
									return new Vow.Promise(function(resolve, reject, notify) {
										customData.save(function(err) {
											if (err) reject(err);
											resolve('done');
										});
									})
								}

								_que.push(storePayerData().then(function(){}, function(err) {
										reject(err);
									})
								);

								Vow.all(_que)
								    .then(function(result) {
										resolve('All done');
									}, function(err) {
										reject(err);
									});

							} else {
								reject('Corrupted pay request data. Please, make a new request');
							}
						} else {
							reject('Unable to verify transaction data');
						}
					} else {
						reject('Unable to get user data fot transaction');
					}
				}.bind(this));
			});
		});
	}

	function checkPayRequest(req, res, next) {
		console.log(req.params.payId);
		console.log(req.body);

		for (key in req.body) {
			if(req.body.hasOwnProperty(key)) {
				var _accToConfirm = this.getAccountByHash(key);

				_accToConfirm && confirmPayRequest(_accToConfirm.href, req.params.payId).then(function(data) {
					req.flash('info', 'Payment confirmed. With status: «' + data + '»');
					next();
				},
				function(data) {
					req.flash('error', 'Payment rejected. With status: «' + data + '»');
					next();
				});

				break
			}
		}

		if (!_accToConfirm) {
			req.flash('error', 'Unable to complete payment');
			next();
		}
	}

	function goBack(req, res, next) {
		res.redirect('back');
	}
	
	router.post('/api/pay/:payId', checkPayRequest, goBack);
});



router.get('/restore/', function(req, res, next) {
	res.redirect('/404.html')
});


// function verifyGroupAccess(req, res, next) {

// 	if (!req.user || req.user.status !== 'ENABLED') {
// 		req.flash('error', 'Какая-то бодяга с авторизацией (');
// 		return res.redirect('/useradmin');
// 	}

// 	if (!req.user.groups || req.user.groups !== 'editors') {
// 		spClient.getAccount(req.user.href, { expand: 'customData' }, function(err, account) {
// 			account.getGroups({ name: 'editors' }, 
// 				function(err, groups) {
// 					groups.each(function(group, cb) {
// 						if (group) {
// 							console.log(group);

// 							var _name = group.name;

// 							req.user.groups || (req.user.groups = {});
// 							req.user.groups = extend(req.user.groups, { _name : true });
// 							next()
// 						}
// 					});
// 				}, 

// 				function(err) {
// 					req.flash('error', 'Печалька, но вы не админ (');
// 					return res.redirect('/admin');
// 				});
// 			}
// 		)

// 	next()
// }

// // admin dashboard
// router.get('/useradmin/home', verifyGroupAccess, function(req, res, next) {
// 	spClient.getAccount(req.user.href, { expand: 'customData' }, function(err, account) {
// 			account.getGroups({ name: 'editors' }, function(err, groups) {
// 				groups.each(function(group, cb) {
// 					group && user.group = { group.name : true };
// 					group && group.getDirectory({ expand:'accounts' }, function(err, directory) {

// 						directory.getAccounts({ expand:'customData' }, function(err, accounts) {
// 							var _selection = [];


// 							accounts.filter(function(application, callback) {
// 								application.getCustomData(function(err, customData) {
// 									//filter
// 									callback(!!customData.payRequest);
// 								});

// 							}, function(err, results) {
// 								// if(err) { req.flash('error', err) }

// 								console.log(err);
// 								console.log(results);

// 								res.render('admin', {
// 									block : 'container',
// 									error : req.flash('error'),
// 									info : req.flash('info'),
// 									menu : dir.menuUserAdmin,
// 									messages : dir.messages,
// 									bundle : 'admin',
// 									active : [ true, true, !!account.customData.payed, !!account.customData.statistic ],
// 									inside: [
// 										{
// 											block : 'adm-payrequests',
// 											appData : dir,
// 											js : {
// 												subscriptions : dir.subscriptions,
// 												bonus : account.customData.bonus ? dir.bonus[account.customData.bonus] : ''
// 											},
// 											uData : {
// 													user : req.user,
// 													custom : account.customData,
// 													payed : account.customData.payed
// 											}
// 										}
// 									]
// 								});
// 							});
// 						});
// 					});

// 				}, 

// 				function(err) {
// 					console.log('Finished iterating over groups.');
// 					req.flash('error', 'Печалька, но вы не админ (');
// 					return res.redirect('/admin');
// 				});
// 		});
// 	});
// });


// Logout the user, then redirect to the home page.
router.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});


// Render the dashboard page.
router.get('/dashboard', function (req, res) {
	if (!req.user || req.user.status !== 'ENABLED') {
		return res.redirect('/login');
	}
	return res.redirect('/dashboard/profile');
});

router.get('/dashboard/profile', function (req, res) {
	if (!req.user || req.user.status !== 'ENABLED') {
		return res.redirect('/login');
	}

	spClient.getAccount(req.user.href, { expand: 'customData' }, function(err, account) {
		if (err) { return next(err) }
		console.log(account.customData);

	var _link = { reflink : makeRefLink('ref_id', dir.domain + dir.Endpoints.register.url + '/', account.email) };
	
		res.render('profile', {
			block : 'container',
			bundle : 'profile',
			error : req.flash('error'),
			info : req.flash('info'),
			menu : dir.menuUserAdmin,
			messages : dir.messages,
			active : [ true, isProfileFiled(req.user) && account.customData.phone, !!account.customData.payed, !!account.customData.statistic ],
			custom : account.customData,
			inside: [
				{
					block : 'profile',
					uData : 
						{
							isfiled : {
								profile : isProfileFiled(req.user),
								template : !!account.customData.template
							},
							user : req.user,
							custom : extend({}, account.customData, _link)
						},
					messages : dir.messages,
					photo : account.customData.photo && account.customData.photo.path
				}
			]
		});
	});
});

// Render the payment page.
router.get('/dashboard/payment', function (req, res) {
	if (!req.user || req.user.status !== 'ENABLED') {
		return res.redirect('/login');
	}

	spClient.getAccount(req.user.href, { expand: 'customData' }, function(err, account) {
		res.render('payment', {
			block : 'container',
			error : req.flash('error'),
			info : req.flash('info'),
			menu : dir.menuUserAdmin,
			messages : dir.messages,
			bundle : 'payment',
			active : [ true, true, !!account.customData.payed, !!account.customData.statistic ],
			inside: [
				{
					block : 'pay',
					appData : dir,
					js : {
						subscriptions : dir.subscriptions,
						bonus : account.customData.bonus ? dir.bonus[account.customData.bonus] : ''
					},
					uData : {
						user : req.user,
						custom : account.customData,
						bonus : dir.bonus[account.customData.bonus],
						payed : account.customData.payed
					}
				}
			]
		});
	});
});

// Render the edit page.
router.get('/dashboard/edit', function (req, res) {
	if (!req.user || req.user.status !== 'ENABLED') {
		return res.redirect('/login');
	}

	spClient.getAccount(req.user.href, { expand: 'customData' }, function(err, account) {
		res.render('edit', {
			block : 'container',
			error : req.flash('error'),
			info : req.flash('info'),
			menu : dir.menuUserAdmin,
			messages : dir.messages,
			bundle : 'edit',
			active : [ true, true, true, !!account.customData.statistic ],
			inside: [
				{
					block : 'edit',
					appData : dir,
					uData : {
						user : req.user,
						custom : account.customData,
						payed : account.customData.payed
					}
				}
			]
		});
	});
});

// Render the statistics page.
router.get('/dashboard/statistic', function (req, res) {
	if (!req.user || req.user.status !== 'ENABLED') {
		return res.redirect('/login');
	}

	spClient.getAccount(req.user.href, { expand: 'customData' }, function(err, account) {
		res.render('statistic', {
			block : 'container',
			error : req.flash('error'),
			info : req.flash('info'),
			menu : dir.menuUserAdmin,
			messages : dir.messages,
			bundle : 'statistic',
			active : [ true, true, true, true ],
			inside: [
				{
					block : 'statistics',
					appData : dir,
					uData : {
							user : req.user,
							custom : account.customData
					}
				}
			]
		});
	});
});


router.post('/dashboard/edit', function (req, res, next) {
	if (!req.user || req.user.status !== 'ENABLED') {
		return res.redirect('/login');
	}

	req.user.customData.extraFields || (req.user.customData.extraFields = {});

	for (key in req.body) {
		req.user.customData.extraFields[key] = req.body[key];
	}
	
	// saving custom fields

	req.user.customData.save(function (err) {
		if (err) {
			next(err);
		} else {
			res.redirect('/dashboard/edit');
		}
	});

});

router.post('/dashboard/pay', function (req, res, next) {
	if (!req.user || req.user.status !== 'ENABLED') {
		return res.redirect('/login');
	}

	req.user.customData.payRequest || (req.user.customData.payRequest = {});

	for (key in req.body) {
		req.user.customData.payRequest[key] = req.body[key];
	}

	req.user.customData.payRequest.date = Date.now();
	
	// saving custom fields

	req.user.customData.payed || (req.user.customData.payed = 'waiting');
	req.user.customData.save(function (err) {
		if (err) {
			next(err);
		} else {
			req.flash('info', dir.messages.pay.thanks);
			res.redirect('/dashboard/payment');
		}
	});
});

// photo upload handling
router.post('/dashboard/profile/user/photo', function(req, res, next){
	uploader(req, res, function (err) {
		if (err) {
			// An error occurred when uploading
			return next(err);
		}

		if (!req.file) {
			res.redirect('/dashboard/profile');
		} else if (req.file.size > 524288) {
			req.flash('error', dir.messages.errors.toBig);
			res.redirect('/dashboard/profile');
			fs.unlink(req.file.path, function(err) {
				if (err) {
					// An error occurred when deleting old photo
					console.log('Unable to delete oversized photo\n');
					console.warn(err);
				}
			})
		} else {
			var _oldFile = req.file.originalname.split('.');
			var _ext = _oldFile[_oldFile.length - 1];

			spClient.getAccount(req.user.href, { expand: 'customData' }, function(err, account) {
				if (err) { return next(err) }

				// checking if photo is already assigned for the account and deleting the photo if so
				var _oldPhoto = false;
				account.customData.photo && (_oldPhoto = account.customData.photo.path);

				req.user.customData.photo = { path : req.file.path, ext : _ext };

				req.user.customData.save(function (err) {
					if (err) {
						next(err);
					} else {
						res.redirect('/dashboard/profile');

						_oldPhoto && fs.unlink(_oldPhoto, function(err) {
							if (err) {
								// An error occurred when deleting old photo
								console.log('Unable to delete old photo\n');
								console.warn(err);
							}
						})
					}
				});
			});
		}
	})
});


router.post('/dashboard/profile/user', function (req, res, next) {
	if (!req.user || req.user.status !== 'ENABLED') {
		return res.redirect('/login');
	}

	if (!req.body.username) {
		req.flash('error', dir.messages.errors.mustFillUsername);
		return res.redirect('/dashboard/profile');
	}

	if(req.user.username !== req.body.username){
		spClient.getDirectory(dirUrl,  { expand: 'accounts' }, function(err, directory) {
			directory.getAccounts({ username: req.body.username }, function(err, accounts) {
			accounts.each(function(account, cb) {

				req.flash('error', dir.messages.username + ' ' + req.body.username + ' ' + dir.messages.errors.alreadyExists);
				return res.redirect('/dashboard/profile');


			}, function(err) {

				// saving default fields
				req.user.givenName = req.body.name;
				req.user.surname = req.body.surname;
				req.user.username = req.body.username;
				

				req.user.save(function (err) {
					if (err) {
						next(err);
					}
				});

				// saving custom fields
				req.user.customData.phone = req.body.phone;

				if(req.body.vk) {
					req.user.customData.social = { type : 'vk', profile : req.body.vk };
				} else if(req.body.facebook) {
					req.user.customData.social = { type : 'facebook', profile : req.body.facebook };
				} else if(req.body.tweet) {
					req.user.customData.social = { type : 'tweet', profile : req.body.tweet };
				} else {
					req.user.customData.social = {};
				}

				req.user.customData.save(function (err) {
					if (err) {
						next(err);
					} else {
						return res.redirect('/dashboard/profile');
					}

				});
			});

			}.bind(this));
		}.bind(this));
	} else {
		req.user.givenName = req.body.name;
		req.user.surname = req.body.surname;

		req.user.save(function (err) {
			if (err) {
				console.log(err)
				next(err);
			}
		});

		// saving custom fields
		req.user.customData.phone = req.body.phone;

		if(req.body.vk) {
			req.user.customData.social = { type : 'vk', profile : req.body.vk };
		} else if(req.body.facebook) {
			req.user.customData.social = { type : 'facebook', profile : req.body.facebook };
		} else if(req.body.tweet) {
			req.user.customData.social = { type : 'tweet', profile : req.body.tweet };
		} else {
			req.user.customData.social = {};
		}

		req.user.customData.save(function (err) {
			if (err) {
				next(err);
			} else {
				return res.redirect('/dashboard/profile');
			}

		});
	}
});


module.exports = router;
