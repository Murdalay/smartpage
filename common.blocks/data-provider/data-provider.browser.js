modules.define('data-provider', ['i-bem__dom'], function(provide, BEMDOM) {

provide(BEMDOM.decl(this.name, {
    onSetMod : {
        'js' : {
            'inited': function() {
            	this._provides = {};

            	for (item in this.params) {
            		this._provides[item] = this.params[item];
            	}
            }
        }
    },

    getProvide : function(name) {
        return this._provides[name] ? this._provides[name] : null
    }
}));

});
