modules.define('info-message', ['i-bem__dom', 'jquery'], 
	function(provide, BEMDOM) {

provide(BEMDOM.decl(this.name, {
    onSetMod : {
        'js' : {
            'inited' : function() {
				this.bindTo('click', this._onClick);

                setTimeout(this._onClick.bind(this), 30000);
            },
            '' : function() {
				this.unbindFrom('click', this._onClick);
            }
        }     
    },

    _onClick : function(e) {
		$(this.domElem).fadeOut();
    }
}));

});

