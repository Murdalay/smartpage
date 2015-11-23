var express = require('express');
var router = express.Router();
var passport = require('passport');
var stormpath = require('stormpath');
var request = require('request');

// Render the registration page.
router.get('/register', function(req, res) {
  res.render('register', { title: 'Register', error: req.flash('error')[0] });
});


// Register a new user to Stormpath.
router.post('/register', function(req, res) {

  var email = req.body.email;
  var password = req.body.password;

  // Grab user fields.
  if (!email || !password) {
    return res.render('register', { title: 'Register', error: 'Email and password required.' });
  }

  // Initialize our Stormpath client.
  var apiKey = new stormpath.ApiKey(
    process.env['STORMPATH_API_KEY_ID'],
    process.env['STORMPATH_API_KEY_SECRET']
  );
  var spClient = new stormpath.Client({ apiKey: apiKey });

  // Grab our app, then attempt to create this user's account.
  var app = spClient.getApplication(process.env['STORMPATH_APP_HREF'], function(err, app) {
    if (err) throw err;

    app.createAccount({
      givenName: 'John',
      surname: 'Smith',
      username: email,
      email: email,
      password: password,
    }, function (err, createdAccount) {
      if (err) {
        return res.render('register', {'title': 'Register', error: err.userMessage });
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
    console.log(req.query);
  request.post('https://api.stormpath.com/v1/accounts/emailVerificationTokens/' + req.query.sptoken, function (error, response, body) {
    if (error) { return next(error) }
    if (response.statusCode === 200) {
      console.log(body) // Show the HTML for the Google homepage. 
      return res.redirect('/login');
    } else {
      return res.redirect('/reg-error.html')
    }
  })
});


// Render the dashboard page.
router.get('/dashboard', function (req, res) {
  if (!req.user || req.user.status !== 'ENABLED') {
    return res.redirect('/login');
  }

  res.render('dashboard', {
    block : 'page',
    head: [
        { elem : 'js', url : './_dashboard.js' }
    ],
    styles : { elem : 'css', url : './_dashboard.css' },
    title: 'Dashboard',
    content : [{ block:'test', content: '12121213' }]
});

});

module.exports = router;
