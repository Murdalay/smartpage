modules.define('component-client', ['i-bem__dom'], function(provide, BEMDOM, CompCl) {

provide(CompCl.decl({ modName : 'rank', modVal : true }, {
    onSetMod: {
        js: {
            inited: function() {
                this.__base.apply(this, arguments);


                if(this._data) {
                	this.setValue(this._data);
                }

            }
        }
    }
}));

})
