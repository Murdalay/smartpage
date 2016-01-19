modules.define('component-client', ['i-bem__dom'], function(provide, BEMDOM, CompCl) {

provide(CompCl.decl({ modName : 'extra', modVal : true }, {
    onSetMod: {
        js: {
            inited: function() {
                this.__base.apply(this, arguments);


                if(this._data) {
					var data = this._data.split(/((?!.)\s)/);

					data.forEach(function(val){
	                	this.setValue('<p>' + this._data + '</p>');
					}.bind(this));

                }

            }
        }
    }
}));

})
