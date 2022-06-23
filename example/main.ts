
// load the .env file into process.env
require('dotenv').config();

const express = require('express');

const unologin = require('../src/main');

const cookieParser = require('cookie-parser');

const {
  onAuthError,
  parseLogin,
  requireLogin,
  loginEventHandler,
  logoutHandler,
} = unologin.express;

// setup unologin
unologin.setup(
  {
    // your unologin api key
    apiKey: process.env.UNOLOGIN_API_KEY,
    // domain(s) on which to set cookies
    cookiesDomain: process.env.UNOLOGIN_COOKIES_DOMAIN,
  },
);

// you can disable secure cookies when testing locally without https
if (process.env.UNOLOGIN_DEBUG_DISABLE_SECURE === 'true')
{
  // unologin will refuse to to this if process.env.NODE_ENV is not development
  // but you should not rely on that alone. 
  unologin.express.debug_useSecureCookies(false);
}

// OPTIONAL: decide what happens if
// 1. a user is not logged in where requireLogin is active (see below) or
// 2. a user has provided invalid login credentials where parseLogin is active (see below)
onAuthError(function(req, res)
{
  // this is actually the default behavior, but you can do anything you want in here
  // if you're fine with the default behavior, simply skip onAuthError(...)

  // you can actually call the logoutHandler as a function when not providing next()
  // this will cause the user to get logged out 
  logoutHandler(req, res);
  res.status(401);
  res.send('Auth error: ' + res.locals.unologin?.msg || 'unknown error');
});

const app = express();

// unologin middleware requires a cookie parser
app.use(cookieParser());

// this handles your login events
// the url http(s)://<your api domain>/unologin/login must be set as your loginHandler in the dashboard
app.use('/unologin/login', loginEventHandler);

// from here on, we can use parseLogin to parse login information
// the login information is available in res.locals.unologin
// IMPORTANT: 
app.use('*', parseLogin);

// you can then use requireLogin to make sure a user is logged in for certain actions
// IMPORTANT: this requires that parseLogin has been added to the app before
app.use('/me/*', requireLogin);

app.get('/me/print-user', (req, res) => 
{
  // after using parseLogin, the user will be stored in res.locals.unologin.user if logged in
  res.send(res.locals.unologin.user);
});

// the logoutHandler will delete all login related cookies and then call next()
// this means that you can call res.send() yourself
app.post('/logout', logoutHandler, function(req, res)
{
  res.send('We hope to have you back soon!');
});

const port = process.env.PORT || 8081;

app.listen(port, () => 
{
  console.log('Example app listening on port ' + port);
});
