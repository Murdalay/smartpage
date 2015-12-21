var express = require('express');
var router = express.Router();
var passport = require('passport');
var stormpath = require('stormpath');
var request = require('request');
var multer  = require('multer');
var fs = require('fs');
var dir;
var uploader = multer({ 
  dest : './photos/',

  rename : function(fieldname, filename) {
      return filename;
  },

  limits : {
    fileSize : 5242880  
  },

  fileFilter : function(req, file, cb) {
    var _oldFile = file.originalname;
    
    _oldFile = _oldFile.split('.');
    var _ext = _oldFile[_oldFile.length - 1];


    if(_ext !== 'png' && _ext !== 'jpg' && _ext !== 'bmp' && _ext !== 'gif') {
      req.flash('error', dir.messages.errors.unsupported);

      cb(null, false);
    } else {
      cb(null, true);
    }
  },


  onFileUploadStart: function (file) {
    console.log(file.originalname + ' is starting ...\n');
  },

  onFileUploadComplete: function (file) {
    console.log(file.fieldname + ' uploaded to  ' + file.path);
    done=true;
  }
}).single('avatar');

// Initialize our Stormpath client.
var apiKey = new stormpath.ApiKey(
  process.env['STORMPATH_API_KEY_ID'],
  process.env['STORMPATH_API_KEY_SECRET']
);

var spClient = new stormpath.Client({ apiKey: apiKey });

// Render the registration page.
router.get('/register', function(req, res) {
  res.render('register', { title: 'Register', error: req.flash('error')[0] });
});

function isProfileFiled (user) {
  return user.username !== 'null' && user.givenName  !== 'null' && user.surname !== 'null';
}


spClient.getDirectory('https://api.stormpath.com/v1/directories/14CzfxWB2inuWwRi8tIZ8y', { expand: 'customData' }, function(err, dirr) {
    if (err) throw new Error(err);
    
    var _dir = {};

    dir = dirr.customData;

    for(key in dir) {
      if(dir.hasOwnProperty(key)) {
        _dir[key] = dir[key];
      }
    }
    dir = _dir;
});


// Register a new user to Stormpath.
// router.post('/register', function(req, res) {

//   var email = req.body.email;
//   var password = req.body.password;

//   // Grab user fields.
//   if (!email || !password) {
//     console.log(!email || !password);
//     return res.render('register', { title: 'Register', error: 'Email and password required.' });
//   }

//   // Grab our app, then attempt to create this user's account.
//   var app = spClient.getApplication(process.env['STORMPATH_APP_HREF'], function(err, app) {
//     if (err) throw err;

//     app.createAccount({
//       givenName: 'null',
//       surname: 'null',
//       username:  'smartuser' + Date.now(),
//       email: email,
//       password: password,
//       customData : {
//         phone : null,
//         template : null,
//         payed : false,
//         wallet : false,
//         payDates: false,
//         social: {}
//       }
//     }, function (err, createdAccount) {
//       if (err) {

//         console.error(err);

//          return res.render('main', {
//                   block : 'container',
//                   bundle : 'main',
//                   mods : { error  : true },
//                   title : 'Ошибка регистрации',
//                   active : [ false, false, false, false ],
//                   custom : {},
//                   inside: err.userMessage
//               });

//       } else {
//           return res.redirect('/success.html');
//         // passport.authenticate('stormpath')(req, res, function () {
//         //   return res.redirect('/dashboard');
//         // });
//       }
//     });

//   });

// });


// Render the login page.
  // res.render('login', { title: 'Login', error: req.flash('error')[0] });


// Logout the user, then redirect to the home page.
router.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});


// Authenticate a user.
router.post(
  '/login',
  passport.authenticate(
    'stormpath',
    {
      successRedirect: '/dashboard',
      failureRedirect: '/log-error.html',
      failureFlash: 'Invalid email or password.',
    }
  )
);

router.get('/verify/', function(req, res, next) {
  var _username = process.env['STORMPATH_API_KEY_ID'],
      _password = process.env['STORMPATH_API_KEY_SECRET'],
      _url = 'https://api.stormpath.com/v1/accounts/emailVerificationTokens/';


  request.post({ url : _url + req.query.sptoken, 'auth': { 'user': _username, 'pass': _password, 'sendImmediately': false }}, 
    function (error, response, body) {
    if (error) { return next(error) }
    if (response.statusCode === 200) {
      return res.redirect('/login');
    } else {
      return res.redirect('/reg-error.html')
    }
  });
});

router.get('/restore/', function(req, res, next) {
  res.redirect('/404.html')
});


// Render the dashboard page.
router.get('/dashboard', function (req, res) {
  if (!req.user || req.user.status !== 'ENABLED') {
    return res.redirect('/login');
  }
    return res.redirect('/dashboard/profile');

});

router.get('/dashboard/profile', function (req, res) {
  if (!req.user || req.user.status !== 'ENABLED') {
    return res.redirect('/login');
  }

  spClient.getAccount(req.user.href, { expand: 'customData' }, function(err, account) {
    if (err) { return next(err) }
    console.log(account.customData);
  
      res.render('main', {
        block : 'container',
        bundle : 'main',
        error : req.flash('error'),
        info : req.flash('info'),
        title : 'Профиль пользователя',
        active : [ true, isProfileFiled(req.user) && account.customData.phone, !!account.customData.payed, !!account.customData.statistic ],
        custom : account.customData,
        inside: [
          {
            block : 'profile',
            uData : 
              {
                isfiled : {
                  profile : isProfileFiled(req.user),
                  template : !!account.customData.template
                },
                user : req.user,
                custom : account.customData
              },
              photo : account.customData.photo && account.customData.photo.path
          }
        ],
    });
  });
});

// Render the payment page.
router.get('/dashboard/payment', function (req, res) {
  if (!req.user || req.user.status !== 'ENABLED') {
    return res.redirect('/login');
  }

  spClient.getAccount(req.user.href, { expand: 'customData' }, function(err, account) {
      res.render('payment', {
        block : 'container',
        error : req.flash('error'),
        info : req.flash('info'),
        bundle : 'payment',
        title : 'Оплата услуг',
        active : [ true, true, !!account.customData.payed, !!account.customData.statistic ],
        inside: [
          {
            block : 'pay',
            appData : dir,
            js : {
              subscriptions : dir.subscriptions
            },
            uData : {
                user : req.user,
                custom : account.customData,
                payed : account.customData.payed
            }
          }
        ],
    });
  });
});

// Render the edit page.
router.get('/dashboard/edit', function (req, res) {
  if (!req.user || req.user.status !== 'ENABLED') {
    return res.redirect('/login');
  }

  spClient.getAccount(req.user.href, { expand: 'customData' }, function(err, account) {
      res.render('edit', {
        block : 'container',
        error : req.flash('error'),
        info : req.flash('info'),
        bundle : 'edit',
        title : 'Редактор',
        active : [ true, true, true, !!account.customData.statistic ],
        inside: [
          {
            block : 'edit',
            appData : dir,
            uData : {
                user : req.user,
                custom : account.customData,
                payed : account.customData.payed
            }
          }
        ],
    });
  });
});

// Render the statistics page.
router.get('/dashboard/statistic', function (req, res) {
  if (!req.user || req.user.status !== 'ENABLED') {
    return res.redirect('/login');
  }

  spClient.getAccount(req.user.href, { expand: 'customData' }, function(err, account) {
      res.render('statistics', {
        block : 'container',
        error : req.flash('error'),
        info : req.flash('info'),
        bundle : 'statistics',
        title : 'Статистика',
        active : [ true, true, true, true ],
        inside: [
          {
            block : 'statistics',
            appData : dir,
            uData : {
                user : req.user,
                custom : account.customData
            }
          }
        ],
    });
  });
});


router.post('/dashboard/edit', function (req, res, next) {
  if (!req.user || req.user.status !== 'ENABLED') {
    return res.redirect('/login');
  }

  req.user.customData.extraFields || (req.user.customData.extraFields = {});

  for (key in req.body) {
    req.user.customData.extraFields[key] = req.body[key];
  }
  
  // saving custom fields

  req.user.customData.save(function (err) {
    if (err) {
      next(err);
    } else {
      res.redirect('/dashboard/edit');
    }
  });

});


router.post('/dashboard/profile/user/photo', function(req, res, next){
  uploader(req, res, function (err) {
    if (err) {
      // An error occurred when uploading
      return next(err);
    }

    if (!req.file) {
      res.redirect('/dashboard/profile');
    } else if (req.file.size > 524288) {
      req.flash('error', dir.messages.errors.toBig);
      res.redirect('/dashboard/profile');
      fs.unlink(req.file.path, function(err) {
        if (err) {
          // An error occurred when deleting old photo
          console.log('Unable to delete oversized photo\n');
          console.warn(err);
        }
      })
    } else {
      var _oldFile = req.file.originalname.split('.');
      var _ext = _oldFile[_oldFile.length - 1];

      spClient.getAccount(req.user.href, { expand: 'customData' }, function(err, account) {
        if (err) { return next(err) }

        // checking if photo is already assigned for the account and deleting the photo if so
        var _oldPhoto = false;
        account.customData.photo && (_oldPhoto = account.customData.photo.path);

        req.user.customData.photo = { path : req.file.path, ext : _ext };

        req.user.customData.save(function (err) {
          if (err) {
            next(err);
          } else {
            res.redirect('/dashboard/profile');

            _oldPhoto && fs.unlink(_oldPhoto, function(err) {
              if (err) {
                // An error occurred when deleting old photo
                console.log('Unable to delete old photo\n');
                console.warn(err);
              }
            })
          }
        });
      });
    }
  })
});

router.post('/dashboard/profile/user', function (req, res, next) {
  if (!req.user || req.user.status !== 'ENABLED') {
    return res.redirect('/login');
  }

  // saving default fields
  req.user.givenName = req.body.name;
  req.user.surname = req.body.surname;
  req.user.username = req.body.username;

  req.user.save(function (err) {
    if (err) {
      next(err);
    }
  });
  
  // saving custom fields
  req.user.customData.phone = req.body.phone;

  if(req.body.vk) {
    req.user.customData.social = { type : 'vk', profile : req.body.vk };
  } else if(req.body.facebook) {
    req.user.customData.social = { type : 'facebook', profile : req.body.facebook };
  } else if(req.body.tweet) {
    req.user.customData.social = { type : 'tweet', profile : req.body.tweet };
  } else {
    req.user.customData.social = {};
  }

  req.user.customData.save(function (err) {
    if (err) {
      next(err);
    } else {
      res.redirect('/dashboard');
    }
  });

});

module.exports = router;
