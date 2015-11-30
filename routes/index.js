var express = require('express');
var router = express.Router();
var passport = require('passport');
var stormpath = require('stormpath');
var request = require('request');
var multer  = require('multer');
var uploader = multer({ dest: './photos/', 
  rename : function(fieldname, filename) {
      return filename;
  },
  onFileUploadStart: function (file) {
    console.log(file.originalname + ' is starting ...')
  },
  onFileUploadComplete: function (file) {
    console.log(file.fieldname + ' uploaded to  ' + file.path)
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

// Register a new user to Stormpath.
router.post('/register', function(req, res) {

  var email = req.body.email;
  var password = req.body.password;

  console.log(email);
  console.log(password);
  console.log(req.body);

  // Grab user fields.
  if (!email || !password) {
    console.log(!email || !password);
    return res.render('register', { title: 'Register', error: 'Email and password required.' });
  }




  // Grab our app, then attempt to create this user's account.
  var app = spClient.getApplication(process.env['STORMPATH_APP_HREF'], function(err, app) {
    if (err) throw err;

    var _mail = email.split('@');

    app.createAccount({
      givenName: 'null',
      surname: 'null',
      username:  Date.now() + Date.now(),
      email: email,
      password: password,
      customData : {
        phone: null,
        template: null,
        social: {}
      }
    }, function (err, createdAccount) {
      if (err) {

        console.error(err);

         return res.render('main', {
                  block : 'container',
                  bundle : 'main',
                  title : 'Ошибка регистрации',
                  active : [ false, false, false, false ],
                  custom : {},
                  inside: err
              });

      } else {
          return res.redirect('/success.html');
        // passport.authenticate('stormpath')(req, res, function () {
        //   return res.redirect('/dashboard');
        // });
      }
    });

  });

});


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

  console.dir(req.user);

    spClient.getAccount(req.user.href, { expand: 'customData' }, function(err, account) {
      console.log(account.customData);
    
        res.render('main', {
          block : 'container',
          bundle : 'main',
          title : 'Профиль пользователя',
          active : [ true, isProfileFiled(req.user) && account.customData.phone, !!account.customData.template, false ],
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


router.post('/dashboard/user/photo', function(req, res, next){
  uploader(req, res, function (err) {
    if (err) {
      // An error occurred when uploading
      return next(err)
    }

    console.log(req.file);

    var _oldFile = req.file.originalname;
    
    _oldFile = _oldFile.split('.');
    var _ext = _oldFile[1];

    console.log(_oldFile);
    console.log(_ext);
    console.log(req.user);

    if(_ext !== 'png' && _ext !== 'jpg' && _ext !== 'bmp' && _ext !== 'gif') {
      res.status(500).send('Unsoported file type');
    } else if(req.file.size > 524288)  {
      res.status(500).send('File size limit is excceeded. It shuld not be bigger than 0.5mb');
    } else  {
      req.user.customData.photo = { path : req.file.path, ext : _ext };

      req.user.customData.save(function (err) {
        if (err) {
          next(err);
        } else {
          res.redirect('/dashboard');
        }
      });
    }
  })
});

router.post('/dashboard/user', function (req, res, next) {
  if (!req.user || req.user.status !== 'ENABLED') {
    return res.redirect('/login');
  }

  console.log(req.body);

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


//   spClient.getAccount(req.user.href, { expand: 'customData' }, function(err, account) {

  
//       res.render('main', {
//         block : 'container',
//         inside: { 
//           block : 'user-data',
//           isfiled : {
//             profile : isProfileFiled(req.user),
//             template : !!account.customData.template
//           },
//           user : req.user,
//           custom : account.customData

//         },
//         bundle : 'main',
//         title : 'Профиль пользователя',
//         active : [ true, isProfileFiled(req.user), !!account.customData.template, false ],
//         custom : account.customData
//     });
//   // });



});

module.exports = router;
