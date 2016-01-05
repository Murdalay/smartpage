/* global modules:false */

modules.define('pay', ['i-bem__dom'], function(provide, BEMDOM) {

provide(BEMDOM.decl(this.name, {
    onSetMod : {
        'js' : {
            'inited': function() {
                this._tarif = this.findBlockInside('tarif');
                if (!this._tarif.hasMod('disabled', true)) {
                	this._input = this.findBlockInside({ block : 'input', modName : 'number', modVal : true });
                    this._summ = this.findBlockInside({ block : 'input', modName : 'summ', modVal : true });
                    this._sum = this.findBlockInside({ block : 'input', modName : 'sum', modVal : true });
                    this._save = this.findBlockInside({ block : 'input', modName : 'save', modVal : true });
                    this._hiddenEndDate = this.findBlockInside({ block : 'input', modName : 'endDate', modVal : true });
                    this._endDate = this.findBlockInside({ block : 'basic-text', modName : 'endDate', modVal : true });
                	this._freeMonths = this.findBlockInside({ block : 'input', modName : 'freeMonths', modVal : true });
                	this._term = this.findBlockInside('radio-group');

                	this._term.getVal() || this._term.setVal('year');

                    this._term.on('change', this._setSumm, this);
                	this._input.on('change blur', this._onNumberInput, this);
                	this._tarif.on({ modName : 'tarif', modVal : '*' }, this._onTarifChange.bind(this));

                    this._subscript = this.params.subscriptions;
    		        this._bonus = this.params.bonus && this.params.bonus.type === 'discount' ? this.params.bonus.val : false;
    		        this._cost = this._subscript[0].cost;

                    this._setSumm();
                }
            }
        }
    },

    _calcDurrationCost : function(durration) {
        if(durration >= 12) {
            var _durration = Math.floor(durration / 12);
            var _rest = durration - _durration * 12;

            return (this._cost.year * _durration) + (this._cost.from * _rest);
        } else {
            return this._cost.from * durration;
        }
    },

    _setSumm : function() {
        var _number = this._input.getVal();
        var _basePrice = this._cost.price;
        var _durration = this._term.getVal() === 'year' ? 12 * _number : Number(_number);
        var _durrationCost = this._calcDurrationCost(_durration);
        var _discount = typeof this._bonus === 'number' ? (_basePrice * this._bonus / 100 ) : 0;
        var _summ = _basePrice + _durrationCost - _discount;
        var _save = _durration > 11 ? _discount + ((this._cost.from * _durration) - _durrationCost) : _discount;

        var _included = this._cost.freeMonths;
        var _endDate = new Date(new Date().setMonth(new Date().getMonth() + (_durration + _included)));

        console.log(this._term.getVal());
        console.log(_endDate.toLocaleDateString());


        this._summ.setVal('$' + _summ);
        this._save.setVal('$' + _save);
        this._sum.setVal(_summ);

        this._freeMonths.setVal(_included);
        this._hiddenEndDate.setVal(_endDate.getTime());
        this._endDate.domElem.html(_endDate.toLocaleDateString());
    },

    _onNumberInput : function() {
        var _number = this._input.getVal(),
            _test = /^[0-9]{1,}$/;

        if(_test.test(_number)){
            this._setSumm();
        } else {
            this._input.setVal(0);
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