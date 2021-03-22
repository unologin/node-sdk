
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
    realm: 
    {
      apiUrl: 'http://local.unolog.in:1061',
      frontendUrl: 'http://local.unolog.in:3000',
    },
  },
);

// you can disable secure cookies when testing locally without https
if (process.env.UNOLOGIN_DEBUG_DISABLE_SECURE === 'true')
{
  // unologin will refuse to to this if process.env.NODE_ENV is not development
  // but you should not rely on that alone. 
  unologin.debug_useSecureCookies(false);
}

// OPTIONAL: decide what happens if
// 1. a user is not logged in where requireLogin is active (see below) or
// 2. a user has provided invalid login credentials where parseLogin is active (see below)
onAuthError(function(req, res)
{
  // this is actually the default behavior, but you can do anything you want in here
  // if you're fine with the default behavior, simply skip onAuthError(...)
  res.status(401);
  res.send(res.locals.unologin?.msg || 'unknown error');
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

// the logoutHandler will delete all login related cookies and then call next()
// this means that you can call res.send() yourself
app.post('/logout', logoutHandler, function(req, res)
{
  res.send('We hope to have you back soon!');
});

app.listen(8081, () => 
{
  console.log('Example app listening...');
});
