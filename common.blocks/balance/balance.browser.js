modules.define('balance', ['i-bem__dom'], function(provide, BEMDOM) {

provide(BEMDOM.decl(this.name, {
    onSetMod: {
        js: {
            inited: function() {
            	this._provider = this.findBlockOutside('page').findBlockInside('data-provider');
            	
            	if(this._provider) {
	            	this._balance = this._provider.getProvide('balance');
	            	this._balance && this.setBalance(this._balance);

            	}


            }
        }
    },

    getBalance : function(e) {
        return this.elem('amount').text();
    },

    setBalance : function(val) {
        this.elem('amount').text(val);
    }
}));

})
