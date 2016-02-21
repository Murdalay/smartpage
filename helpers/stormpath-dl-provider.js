var path = require('path');
var DataLayer = require(path.join(__dirname, 'data-layers'));
var prc = require(path.join(__dirname, 'dl-procedures'));
var motivator = require(path.join(__dirname, 'motivator'));

var stormpath = require('stormpath');

// Initialize our Stormpath client.
var dirUrl = process.env['STORMPATH_BASE_DIR'];
var apiKey = new stormpath.ApiKey(
	process.env['STORMPATH_API_KEY_ID'],
	process.env['STORMPATH_API_KEY_SECRET']
);


var spClient = new stormpath.Client({ apiKey: apiKey });

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
			log.info('Getting group CustomData');
			callback(null, group.customData);
		});
	},

	groupAccounts : function(callback, url) {
		spClient.group(url, { expand: 'accounts' }, callback);
	},

	app : function(callback) {
		spClient.getApplication(process.env['STORMPATH_APP_HREF'], callback);
	},

	dir : function(callback, url) {
		spClient.getDirectory(url ? url : dirUrl, { expand: 'customData' }, callback);
	},

	getDirCustomData : function(callback, url) {
		spClient.getDirectory(url ? url : dirUrl, { expand: 'customData' }, function(err, dirr) {
			if (err) callback(new Error(err));

			callback(null, dirr.customData);
		})
	},

	extendDirCustomData : function(obj, url) {
		return new Vow.Promise(function(resolve, reject, notify) {
			if (typeof obj !== 'object') {
				return reject('You should provide the object to extend customData')
			}

			this.dir(function(err, dirr) {
				if (err) { return reject(err) }

				dirr.getCustomData(function(err, customData) {
					if (err) { return reject(err) }

					customData = extend(customData, obj);

					customData.save(function(err) {
					    if (err) { return reject(err) };

					    resolve('done');
					});
				});
			}, url);
		});
	},

	dirAccounts : function(searchObj, callback, url) {
		var _cb = callback ? callback : searchObj;

		spClient.getDirectory(url ? url : dirUrl, { expand: 'customData' }, function(err, dirr) {
			if (err) _cb(new Error(err));
			if(callback) {
				dirr.getAccounts(searchObj, callback);
			} else {
				dirr.getAccounts(_cb);
			}
		})
	},

	createAccountStore : function(callback, url) {
		this.app(function(err, app) {
			if (err) { return callback(err); };

			var mapping = {
			  accountStore: {
			    href: url ? url : dirUrl
			  },
			  isDefaultAccountStore: !url,
			  isDefaultGroupStore: !url
			};

			app.createAccountStoreMapping(mapping, callback);
		})
	},

	getAccountStores : function(callback) {
		this.app(function(err, app) {
			if (err) { return callback(err); };

			app.getAccountStoreMappings({ expand: 'accountStore' }, callback);
		})
	},

	eachAccount : function(callback, endCb, searchObj) {
		this.dirAccounts(searchObj ? searchObj : { expand: 'customData' }, function(err, accounts) {
			if (err) callback(err);

			accounts.each(callback, endCb);
		})
	},

	getAccountByUsername : function(name, callback) {
		this.getAccountByParam(name,  callback, 'username');
	},

	getAccountByParam : function(name, callback, param, reverse) {
		function isParamExist(application, cb) {
		  cb(!reverse ? application[param].replace(' ', '') === name.replace(' ', '') : application[param].replace(' ', '') !== name.replace(' ', '') );
		}

		this.detectAccounts(isParamExist, callback);
	},

	detectAccounts : function(searchFunc, callback) {
		this.dirAccounts(function(err, accounts) {  
			accounts.detect(searchFunc, callback)
		})
	}
};



var DlPreInitFunctions = {
	dir : function(callback, name) {
		spClient.getDirectory(dirUrl, { expand: 'customData' }, function(err, dirr) {
			if (err) throw new Error(err);

			log.info('getting dir ' + name)

			return callback(null, name, dirr, 'dir');
		});
	},

	groups : function (callback, name) {
		spClient.getDirectory(dirUrl, { expand: 'customData' }, function(err, directory) {
			if (err) throw new Error(err);
			
			log.info('getting group ' + name)
			
			directory.getGroups({ expand: 'customData' }, function(err, groups) {
				groups.each(function(group, cb) {
					callback(null, group.name, group, 'groups');
					cb()
				}, 

				function(err, ress) {
					if (err) throw new Error(err);
				});
			});
		});
	}
};



function provideSpDataLayer(layers, funcGroupTypesCb, onInit) {
	// do some voodoo magic – registering helpers in current context //
	require(path.join(__dirname, 'helpers'))(this);
	var DL = new DataLayer(layers, dataProviders, funcGroupTypesCb);
	
	var DLmap = {
		self : ['dir'],
		users : ['groups']
	};

	function initDataLayers(cb, DLmap) {
		function registerBasics(err, name, data, type) {
			if(err) { throw new Error('basic data layer initialization problem'); }

			if(type === 'dir') {
				DL('set', 'dir')(name, data);
			} else if(type === 'groups') {
				DL('set', 'group')(name, data);
			}
		}
		

		literalMethodsLauncher(DlPreInitFunctions, DLmap, registerBasics, cb);
	}

	// start all thing
	initDataLayers(onInit, DLmap);
	DL = prc(DL);

	var upAccs = DL('run', 'dir')(function() { 
		this.updateAccounts(function(err) {  });
	});

	var _motivatorLaunchList = {
		sixHours : [
			{ fn : DL.proc.updateAccountsRefPayment, args : [], runOnLoad : false }
		],
		hourly : [
			{ fn : upAccs, args : [], runOnLoad : true }
		],
		threeHours : [
			{ fn : initDataLayers, args : [noop, DLmap], runOnLoad : false }
		]
	}
	
	// scheduling the tasks
	motivator(_motivatorLaunchList);

	return DL;
}




module.exports = provideSpDataLayer;
