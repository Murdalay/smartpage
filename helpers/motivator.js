/*
// @params
// launchlist {Object} Object to iter 
// cb {Function} Callback that will be summoned for each launchlist key.
*/
function passFieldToCb(launchlist, cb) {
	for (key in launchlist) {
		if(launchlist.hasOwnProperty(key)){
			cb(launchlist[key], key);
		}
	}
}

function motivator(launchlist) {
	var supportedTime = {
			everyMinute 	: 60000,
			fiveMinutes 	: 300000,
			quoterOfHour 	: 900000,
			halfOfHour 		: 1800000,
			hourly 			: 3600000,
			threeHours 		: 10800000,
			sixHours 		: 21600000,
			dayly 			: 86400000,
			weekly 			: 604800000 
		};


	function motivate(runlist, name) {
		var _timeout = supportedTime[name];

		function launcher(cb, args, ctx) {
			return function() {
				cb.apply(ctx ? ctx : this, args ? args : []);
			}
		}

		if (_timeout) {
			runlist.length && runlist.forEach(function(item) {
				var _funcToRun = launcher(item.fn, item.args, item.ctx);
				setInterval(_funcToRun, _timeout);

				item.runOnLoad ? _funcToRun() : ''
			});
		}
	}

	passFieldToCb(launchlist, motivate)
}

module.exports = motivator;
