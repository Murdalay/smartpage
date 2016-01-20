[{
    mustDeps : [
        { block : 'i-bem', elems : ['dom'] }
    ],
    shouldDeps : [
        { block : 'component-client', mods : { 
                ava : true, 
                email : true, 
                name : true, 
                rank : true, 
                phone : true, 
                skype : true, 
                extra : true, 
                partners : true, 
                invest : true, 
                instagram : true, 
                youtube : true, 
                'hidden-input' : true, 
                tw : true, 
                fb : true, 
                vk : true, 
                reflink : true 
            } 
        },
        { block : 'data-provider' },
        { block : 'page' },
        { block : 'page', elem : 'js' },
        { block : 'page', elem : 'css' },
        { block : 'page', elem : 'meta' }
    ]
}]
