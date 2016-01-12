modules.define('balance', ['i-bem__dom'], function(provide, BEMDOM) {

provide(BEMDOM.decl(this.name, {
    onSetMod: {
        js: {
            inited: function() {

            }
        }
    },

    getBalance : function(e) {
        return this.elem('amount').text();
    },
}));

})
