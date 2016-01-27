modules.define('component-client', ['i-bem__dom', 'jquery'], function(provide, BEMDOM, $) {

provide(BEMDOM.decl(this.name, {
    onSetMod: {
        js: {
            inited: function() {
	        	this._provider = this.findBlockOutside('page').findBlockInside('data-provider');

            	if(this._provider) {
	            	this._mods = this.getMods();
	            	console.log(this._mods);

	            	for (key in this._mods) {
	            		if(key === 'reflink') {
	            			this._data = this._provider.getProvide('ref');
	            		} else if(key === 'hidden-input') {
	            			this._data = this._provider.getProvide('email');
	            		} else if(key !== 'js') {
	            			this._data = this._provider.getProvide(key);
	            		}
	            	}
            	}
            }
        }
    },

    setLink : function(link) {
        this.domElem.attr('href', link);
    },

    setVal : function(val) {
        this.domElem.attr('value', val);
    },

    setEmail : function(email) {
	    this.setValue(email);
	    this.setLink('mailto:' + email);
    },

    setValue : function(val) {
        this.domElem.html(val);
    },

    setAvatar : function(link) {
        this.domElem.css('backgroundImage', 'url(' + '/' + link + ')');
    }
}));

})
