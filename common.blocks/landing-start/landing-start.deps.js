[{
    mustDeps : [
        { block : 'i-bem', elems : ['dom'] }
    ],
    shouldDeps : [
        { block : 'component-client', mods : { 
                ava : true, 
                email : true, 
                name : true, 
                phone : true, 
                skype : true, 
                extra : true, 
                'hidden-input' : true, 
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
