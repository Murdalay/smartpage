modules.define('atom', ['i-bem__dom'], function(provide, BEMDOM) {

provide(BEMDOM.decl(this.name, {
    onSetMod: {
        js: {
            inited: function() {
            	console.log('atom inited');

            }
        }
    }
}));

})
