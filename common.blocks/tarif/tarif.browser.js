/* global modules:false */

modules.define('tarif', ['i-bem__dom'], 
	function(provide, BEMDOM) {

provide(BEMDOM.decl(this.name, {
    onSetMod : {
        'js' : {
            'inited' : function() {
        		this._select = this.findBlockInside('select');

				this._select.on('change', this._onSelectChange, this);
            },
            '' : function() {
				this._select.un('change', this._onSelectChange, this);
            }
        },
        'disabled' : {
            'true' : function() {
        		this._select.setMod('disabled');
            },
            '' : function() {
        		this._select.delMod('disabled');
            }
        }      
    },

    getVal : function() {
    	return this._active ? this._active : this._select.getVal();
    },

    _onSelectChange : function(e) {
    	this._active = e.target.getVal();
    	var _activeElem = this.elem('plan', 'active', true);
    	var _relevantElem = this.elem('plan', 'subscription', this._active);

		this.setMod('tarif', this._active);
        

        this.delMod(_activeElem, 'active');
        this.setMod(_relevantElem, 'active');
    }
}));

});

