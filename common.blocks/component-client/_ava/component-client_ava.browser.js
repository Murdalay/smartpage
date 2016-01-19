modules.define('component-client', ['i-bem__dom'], function(provide, BEMDOM, CompCl) {

provide(CompCl.decl({ modName : 'ava', modVal : true }, {
    onSetMod: {
        js: {
            inited: function() {
                console.log('Ururu');
                this.__base.apply(this, arguments);


                if(this._data) {
                	this.setAvatar(this._data);
                }

            }
        }
    }
}));

})
