var crypto = require('crypto');
var hasOwnProp = Object.prototype.hasOwnProperty;
var path = require('path');
var markedSwig = require('swig-marked'),
    extras = require('swig-extras'),
    swig = require('swig');
	swig.setDefaults({ cache: 'memory' });
	swig.setDefaults({ loader: swig.loaders.fs(path.join(__dirname, '..', 'user.templates'))});
	
	// setting swig filters
    markedSwig.useFilter( swig );
	extras.useFilter(swig, 'batch');
	
	// setting swig tags
    markedSwig.useTag( swig );
 

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
}

function registerHelpers(that) {
	this.extend = extend;
	this.undef;
	this.swig = swig;
	this.noop = function(){};
	this.Vow = require('vow');
	this.log = require(path.join(__dirname, 'logger'))();
	this.mailer = require('../helpers/mailer');
	this.passFieldToCb = function passFieldToCb(launchlist, cb) {
		for (key in launchlist) {
			if(launchlist.hasOwnProperty(key)){
				cb(launchlist[key], key);
			}
		}
	};

	this.stringifyToQuery = function stringifyToQuery(obj) {
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
	};

	this.makeRefLink = function makeRefLink(param, base, email) {
		if(param, base, email) {
			var obj = {};
			obj[param] = crypto.createHash('sha1').update(email).digest("hex");
			return base + '?' + stringifyToQuery(obj);
		} else {
			return ''
		}
	};

	this.literalMethodsLauncher = function literalMethodsLauncher(methods, launchlist, iterator, cb) {
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
			cb(new Error('literal or array must be provided as the list of methods'));
		}
	};

	this.makeHashForEmail = function makeHashForEmail(email) {
		return crypto.createHash('sha1').update(email).digest("hex");
	};

	return extend(that, {}, this);
}

module.exports = registerHelpers;
