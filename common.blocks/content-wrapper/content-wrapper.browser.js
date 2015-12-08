/* global modules:false */

modules.define('content-wrapper', ['i-bem__dom', 'jquery'], 
	function(provide, BEMDOM, $) {

provide(BEMDOM.decl(this.name, {
    onSetMod : {
        'js' : {
            'inited' : function() {
        		this._scroller = this.findBlockInside('scroller');

        		$('.scroller').mCustomScrollbar({
	              axis: "y",
	              theme: "minimal-dark",
	              scrollbarPosition: "inside"
	            });

            },
            '' : function() {
            }
        },
        'disabled' : {
            'true' : function() {
        		this._scroller.setMod('disabled');
            },
            '' : function() {
        		this._scroller.delMod('disabled');
            }
        }      
    }
}));

});