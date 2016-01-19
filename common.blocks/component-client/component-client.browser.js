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

	            	console.log(this._data);
            	}


    //         	function set_value(component, value) {
				//     var element = document.getElementsByClassName('component_' + component);
				//     for (var i=0; i < element.length; i++) {
				//         element[i].innerHTML = value ;
				//     }
				//     return false;
				// }
				    
				// function set_link(component, link) {
				//     var element = document.getElementsByClassName('component_' + component);
				//     for (var i=0; i < element.length; i++) {
				//         element[i].href = link ;
				//     }
				//     return false;
				// }
				    
				// function set_email(component, value) {
				//     set_value(component, value);
				//     set_link(component, 'mailto:' + value);
				//     $('.component_hidden-input').attr('value', value);
				    
				//     return false;
				// }
				    
				// function set_avatar(component, link) {
				//     var element = document.getElementsByClassName('component_' + component);
				//     for (var i=0; i < element.length; i++) {
				//         element[i].style.backgroundImage = 'url(' + link + ')';
				//     }
				//     return false;
				// }


			// window.onload = function(){
			//     // Конфигурация 
			//     set_value( 'name',    'Дмитрий Нагута' );
			//     set_value( 'phone',   '+38 (093) 327-48-81' );
			//     set_value( 'skype',   'starlukas' );
			//     set_link(  'fb',      'https://vk.com/id13267535' );
			//     set_link(  'vk',      'https://vk.com/id13267535' );
			//     set_link(  'tw',      'https://vk.com/id13267535' );
			//     set_link(  'youtube', 'https://www.youtube.com/channel/UCISiUmdwQTrUS6H0aVQHYiQ/videos' );
			//     set_link(  'instgram','https://instagram.com/vadymkull/' );
			//     set_link(  'reflink', 'https://pa.bluebeard24.com/registerstepone?ref=mmrd' );
			//     set_email( 'email',   'starlukas@helix.biz' );
			//     set_avatar('ava',     'images/x9jkl8furmi.jpg' );

			// };
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
        this.domElem.css('backgroundImage', 'url(' + link + ')');
    }
}));

})
