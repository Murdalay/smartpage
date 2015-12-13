/* global modules:false */

modules.define('pay', ['i-bem__dom'], function(provide, BEMDOM) {

provide(BEMDOM.decl(this.name, {
    onSetMod : {
        'js' : {
            'inited': function() {
            	this._tarif = this.findBlockInside('tarif');
            	this._summ = this.findBlockInside({ block : 'input', modName : 'summ', modVal : true });
            	this._term = this.findBlockInside('radio-group');

            	this._term.getVal() || this._term.setVal('year');

            	this._term.on('change', this._setSumm, this);
            	this._tarif.on({ modName : 'tarif', modVal : '*' }, this._onTarifChange.bind(this));

		        this._subscript = this.params.subscriptions;
		        this._cost = this._subscript[0].cost;

                this._setSumm();
            }
        }
    },

    _setSumm : function() {
        this._summ.setVal(this._term.getVal() === 'year' ? this._cost.year : this._cost.from);
    },

    _onTarifChange : function(e, mod) {
        this._subscript.forEach(function(elem){
        	if(elem.val === mod.modVal) {
				this._cost = elem.cost;
        	}
        }.bind(this));

	    this._setSumm();
    }
}));

});