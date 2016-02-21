var Baobab = require('baobab')

function DataLayer(layersObj, dataProviders, dlCallbacks) {
	var data = { accounts : {}, dir : {}, groups : {} };
	var providers = {};
	var components = {};
	var groups = {};
	var fGroupTypesCb = {};
	var fCompTypesCb = {};
	var layers = {};
	var users = new Baobab({});
	var userByUsername = {};
	var registredLayers = layersObj ? layersObj : {};

	function _getActiveDataProviders(res, key) {
		providers[key] = res;
		log.info('registring data provide ' + key)
	}

	function _getFuncGroupTypesCb(res, key) {
		fGroupTypesCb[key] = res;
		log.info('registring callbacks for functional Group type ' + key)
	}

	function _getFuncCompTypesCb(res, key) {
		fCompTypesCb[key] = res;
		log.info('registring callbacks for functional Component type ' + key)
	}

	function getAccounts (query, cb) {
		return providers.dirAccounts(query, cb);
	}

	function updateAccount(acc, cb) {
		var _hash = makeHashForEmail(acc.email);
		users.set(_hash, extend({}, acc));
		userByUsername[acc.username.replace(/[\ ]/g, '')] = users.select(_hash);

		cb && cb()
	}

	function updateAccounts(endCb) {
		providers.eachAccount(updateAccount, endCb.bind(this));
	}

	function registerDir(name, dir) {	
		data.dir = extend({}, data.dir, dir);
		layers[name] = extend(layers[name], dir);
		log.info('dir %s registred\n\n', name);
	}

	function registerLayer(name, dir) {	
		layers[name] = extend(layers[name], dir);
		log.info('lasyer %s registred\n\n', name);
	}

	function registerGroup(name, group) {
		groups[name] = extend(null, { url : group.href, name: name }, group);
		groups[name].customData.mergedMessages = extend({}, data.dir.customData.messages, groups[name].customData.messages);
		log.info('group %s registered\n\n', name);
	}

	function initPages(cb) {
		var _that = this;
		var _pages = this.getPages();
		var _paths = this.getPaths(); 
		var _grpName = this.getName(); 
		var _endpoints = this.getEndpoints(); 
		var _providers = this.getProviders(); 
		var _components = this.getFuncComponents(); 
		var _fGroups = this.getFuncGroups(); 
		var _header = { basePath : _paths.basePath, items : [] };

		function _initPage(item) {
			var fGroups = [];

			for (var key in item.fGroups) {
				fGroups.push({ fGroup : _fGroups[key], params : item.fGroups[key] });
			}

			_header.items.push({ value : item.id, title : item.title });

			// Page class definitions
			function Page() {
				this.name = item.id;
				this.title = item.title;
				this.groupName = _grpName;
				this.bundle = item.bundle;
				this.template = item.template;
				this.providers = _providers;
				this.fGroups = fGroups;
				this.header = _header;
				this.endpoints = _endpoints;
				this.page = item;

				this.getGroupName = function() { return this.groupName };
				this.getName = function() { return this.name };
				this.getPage = function() { return this.page };
				this.getEndpoints = function() { return this.endpoints };
				this.getFuncGroups = function() { return this.fGroups };
				this.getProviders = function() { return this.providers };
				this.getBundle = function() { return this.bundle };
				this.getTemplate = function() { return this.template };
				this.getTitle = function() { return this.title };
				this.getHeader = function() { return this.header };
				this.dirAccounts = this.getProviders().dirAccounts.bind(this);
				this.initFuncGroups = function(cb) {
					var _grp = this.getFuncGroups();
					var _fieldSets = this.getFieldSets();
					var _grpPromises = [];

					log.debug('Initing fGroup', _grp);
					function _initGrp(item) {
						var _cb = fGroupTypesCb[item.fGroup.type];
						var _comp = item.fGroup.fComponents;

						for(var cName in _comp) {
							var _currComp = _components[cName];

							if(_currComp) {
								var _currFieldSets = _currComp.fieldSets;

								log.verbose('current fComponent is %s', cName, _currComp);

								if (_currFieldSets) {
									var _fsArray = [];

									_currFieldSets.forEach(function(fSet) {
										if(_fieldSets[fSet]) {
											_fsArray.push(_fieldSets[fSet]);
										}
									}.bind(this));
									
									var _currCompCb = fCompTypesCb[_currComp.type];

									_currCompCb && _currCompCb(_currComp, _comp[cName], _fsArray);
								}


							}
						}

						log.verbose('fComponents is', _components);

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
					    }.bind(this));

						_grpPromises.push(_promise);
					}

					_grp.length && _grp.forEach(_initGrp.bind(this));

					Vow.all(_grpPromises)
					    .then(cb.bind(this));
				};
			}

			var _newCtx = new Page();

			return cb.apply(extend({}, _that, _newCtx));
		}

		_pages.forEach(_initPage);
	}

	passFieldToCb(dataProviders, _getActiveDataProviders);
	passFieldToCb(dlCallbacks.funcGroupTypesCb, _getFuncGroupTypesCb);
	passFieldToCb(dlCallbacks.funcCompTypesCb, _getFuncCompTypesCb);

	log.verbose('DL is created');

	// Base Directory class definitions
	function Dir() {
		this.name = data.dir.name;
		this.updateAccounts = updateAccounts;
		this.updateAccount = updateAccount;

		this.getName = function() {
			return data.dir.name;
		};
		this.getUsers = function(cb) {
			var _that = this;
			var _layer = registredLayers['users'];

			this.getAccountStore(function(err, asm) {
				var _newCtx = new Users(asm);
				var _base = _layer ? new Layer('users', _layer) : {};

				return cb.apply(extend({}, _that, _base, _newCtx));
			});
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
		this.getConf = function() {
			return data.dir.customData._conf;
		};
		this.getDefConf = function() {
			return this.getConf().def;
		};
		this.getAccountByHash = function(hash) {
			return users.get(hash) ? users.get(hash) : null;
		};
		this.getAccountByUsername = function(username) {
			var usrName = (username + '').replace(/[\ ]/g, '');
			return userByUsername[usrName] ? userByUsername[usrName].get() : null;
		};
		this.getAccountByUrl = function(url, cb) {
			return providers.accountByUrl.apply(this, [url, cb]);
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
			cb.bind(this);
			endCb.bind(this);
			return providers.eachAccount(cb, endCb, query);
		};	
		this.getAccountStore = function(cb) {
			return providers.createAccountStore(cb);
		};
		this.extendDirCustomData = function(obj, url) {
			return providers.extendDirCustomData.apply(this, arguments);
		};
		this.registerEndPoints = function(endpointCallbacks, extra) {
			var endpoints = this.getEndpoints();
			var msg = this.getMessages();

			for (point in endpoints) {
				if(!!endpointCallbacks[point]) {
					endpointCallbacks[point](endpoints[point], msg, extra);
				}
			}
		};

		this.getFuncComponents = function() {
			return data.dir.customData.functionalComponents;
		};
		this.getFuncGroups = function() {
			return data.dir.customData.functionalGroups;
		};
		this.getFieldSets = function() {
			return data.dir.customData.fieldSets;
		};
	}

	// Arbitrary Data Layer class definitions
	function Layer(name, url) {
		this.url = url;
		this.name = name;
		this.customData = layers[name] && layers[name].customData ? layers[name].customData : data.dir.customData;

		this.getName = function() {
			return this.name;
		};
		this.getPages = function() {
			return this.customData.Pages;
		};
		this.getEndpoints = function() {
			return this.customData.Endpoints;
		};				
		this.getUrl = function() {
			return this.url;
		};
		this.getMessages = function() {
			return this.messages;
		};
		this.getPaths = function() {
			return this.customData.PATHS;
		};
		this.getCustomData = function() {
			return this.customData;
		};
		this.accessDirCustomData = function(callback) {
			return providers.dir(callback, this.getUrl());
		};

		this.extendDirCustomData = function(obj, url) {
			return providers.extendDirCustomData.apply(this, [obj, url ? url : this.getUrl()]);
		};
	}

	// Users class definitions
	function Users(store) {
		this.getAccountStore = function() {
			return this.accStore;
		};
		this.getAccountByUsername = function(name, callback) {
			_cb = callback.bind(this);

			return providers.getAccountByUsername.apply(this, [name, _cb]);
		};	
		this.getAccountByParam = function(name, callback, param, reverse) {
			return providers.getAccountByParam(name, callback, param, reverse);
		};	
		
		this.accStore = store;
	}
	
	// Group class definitions
	function Grp(name) {
		this.name = groups[name].name;
		this.messages = groups[name].customData.mergedMessages;
		this.Pages = groups[name].customData.Pages;
		this.Endpoints = groups[name].customData.Endpoints;
		this.url = groups[name].url;
		this.fGroups = groups[name].customData.functionalGroups;
		this.fComponents = groups[name].customData.functionalComponents;
		this.fieldSets = groups[name].customData.fieldSets;
		this.providers = providers;
		this.data = groups[name].customData;

		this.getName = function() {
			return this.name;
		};
		this.getMessages = function() {
			return this.messages;
		};
		this.getPages = function() {
			return this.Pages;
		};
		this.getEndpoints = function() {
			return this.Endpoints;
		};				
		this.getUrl = function() {
			this.url;
		};
		this.getProviders = function() {
			return this.providers;
		};
		this.initPages = initPages.bind(this);
		this.dirAccounts = this.getProviders().dirAccounts;
		this.getCustomData = function() {
			return this.data;
		};
		this.getAccountStore = function(cb) {
			return providers.createAccountStore.apply(this, [cb, this.getUrl()]);
		};
		this.getPaths = function() {
			var _cd = this.getCustomData();
			return _cd.PATHS;
		};

		this.getFuncComponents = function() {
			return this.fComponents;
		};
		this.getFuncGroups = function() {
			return this.fGroups;
		};
		this.getFieldSets = function() {
			return this.fieldSets;
		};
	}

	// global setters
	return function(action, layer, name) {
		log.info('Creating data layer %s', name);

		function getGroup(cb) {
			var _dirCtx = new Dir();
			var _newCtx = new Grp(name);

			return cb.apply(extend(_dirCtx, _newCtx));
		}

		function runGroup(cb) {
			var _dirCtx = new Dir();
			var _newCtx = new Grp(name);

			return cb.bind(extend(_dirCtx, _newCtx));
		}


		function getDir(cb) {
			var _newCtx = new Dir();

			return cb.apply(_newCtx);
		}

		function runInDirContext(cb) {
			var _newCtx = new Dir();

			return cb.bind(_newCtx);
		}

		function getLayer(cb, layerName) {
			var _dir = new Dir();
			var _newCtx = new Layer(name, registredLayers[name]);

			return cb.apply(extend(_dir, _newCtx));
		}

		function runInLayerContextLayer(cb, layerName) {
			var _dir = new Dir();
			var _newCtx = new Layer(name, registredLayers[name]);

			return cb.bind(extend(_dir, _newCtx));
		}
		
		// handling the current call: giving the layer context or bind callback with it //
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
			} else if (layer === 'layer') {
				if (registredLayers[name]) {
					return getLayer
				} else {
					return null
				}
			}
		}

		if (action === 'run') {
			if(layer === 'group') {
				return runGroup
			} else if (layer === 'dir') {
				return runInDirContext
			} else if (layer === 'layer') {
				if (registredLayers[name]) {
					return runInLayerContextLayer
				} else {
					return runInDirContext
				}
			}
		}
	}
};


module.exports = DataLayer;
