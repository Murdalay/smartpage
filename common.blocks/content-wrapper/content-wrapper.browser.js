/* global modules:false */

modules.define('content-wrapper', ['i-bem__dom', 'jquery'], 
	function(provide, BEMDOM, $) {

provide(BEMDOM.decl(this.name, {
    onSetMod : {
        'js' : {
            'inited' : function() {
        		this._scroller = this.findBlockInside('scroller');

                if(!!this._scroller) {
                    if (this.hasMod('admin', true)) {
                		// $(this._scroller.domElem).mCustomScrollbar({
        	         //      axis: "yx",
        	         //      theme: "minimal-dark",
        	         //      scrollbarPosition: "inside"
        	         //    });
                    } else {
                        $(this._scroller.domElem).mCustomScrollbar({
                          axis: "y",
                          theme: "minimal-dark",
                          scrollbarPosition: "inside"
                        });
                    }
                }
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