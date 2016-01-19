modules.define('component-client', ['i-bem__dom'], function(provide, BEMDOM, CompCl) {

provide(CompCl.decl({ modName : 'hidden-input', modVal : true }, {
    onSetMod: {
        js: {
            inited: function() {
                this.__base.apply(this, arguments);


                if(this._data) {
                	this.setVal(this._data);
                }

            }
        }
    }
}));

})
