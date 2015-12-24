/* global modules:false */

modules.define('pay', ['i-bem__dom'], function(provide, BEMDOM) {

provide(BEMDOM.decl(this.name, {
    onSetMod : {
        'js' : {
            'inited': function() {
                this._tarif = this.findBlockInside('tarif');
            	this._input = this.findBlockInside({ block : 'input', modName : 'number', modVal : true });
            	this._summ = this.findBlockInside({ block : 'input', modName : 'summ', modVal : true });
            	this._term = this.findBlockInside('radio-group');

            	this._term.getVal() || this._term.setVal('year');

                this._term.on('change', this._setSumm, this);
            	this._input.on('change blur', this._onNumberInput, this);
            	this._tarif.on({ modName : 'tarif', modVal : '*' }, this._onTarifChange.bind(this));

                this._subscript = this.params.subscriptions;
		        this._bonus = this.params.bonus && this.params.bonus.type === 'discount' ? this.params.bonus.val : '';
		        this._cost = this._subscript[0].cost;

                this._setSumm();
            }
        }
    },

    _setSumm : function() {
        var _number = this._input.getVal();
        var _basePrice = this._term.getVal() === 'year' ? this._cost.year * _number + this._cost.price : this._cost.from * _number + this._cost.price;
        var _discount = typeof this._bonus === 'number' ? (_basePrice * this._bonus / 100 ) : 0;
        this._summ.setVal('$' + (_basePrice - _discount));
    },

    _onNumberInput : function() {
        var _number = this._input.getVal(),
            _test = /^[0-9]{1,}$/;

        if(_test.test(_number)){
            this._setSumm();
        } else {
            this._input.setVal(1);
        }
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