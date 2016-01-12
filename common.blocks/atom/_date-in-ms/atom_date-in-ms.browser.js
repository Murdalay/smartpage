modules.define('atom', ['i-bem__dom'], function(provide, BEMDOM, Atom) {

provide(Atom.decl({ modName : 'date-in-ms' }, {
    onSetMod: {
        js: {
            inited: function() {
            	this._val = this.domElem.text();
            	var _num = Number(this._val);

				if (_num + '' === this._val) {
	            	var date = new Date(_num);
				} else {
	            	var date = new Date(this._val);
				}

            	this.domElem.text(date.toLocaleDateString());
            }
        }
    }
}));

})
