
// load the .env file into process.env
require('dotenv').config();

const express = require('express');

// replace this with require('@unologin/node-sdk') in your project
const unologin = require('../lib/main');

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
    
    // you can disable secure cookies when testing locally without https
    useSecureCookies: !process.env.UNOLOGIN_DEBUG_DISABLE_SECURE,
  },
);


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

// create an express app
const app = express();

// unologin middleware requires a cookie parser
app.use(cookieParser());

// this handles your login events
// the url http(s)://<your api domain>/unologin/login must be a whitelisted callback URL
// this whitelist can be edited through the dashboard
app.use('/unologin/login', loginEventHandler);

// from here on, we can use parseLogin to parse login information
// the login information is available in res.locals.unologin
// 
// IMPORTANT: This will only parse the login token if the user is logged in.
//            If the user is not logged in, the request is passed to the next handler.
// 
// this will store the parsed login information in res.locals.unologin.user
app.use('*', parseLogin);

// you can then use requireLogin to make sure a user is logged in for certain actions
// IMPORTANT: this requires that parseLogin has been added to the app before
app.use('/me/*', requireLogin);

// since this route starts with /me/, we can ensure that the user is logged in
app.get('/me/print-token', (req, res) => 
{
  // after using parseLogin, the user will be stored in res.locals.unologin.user
  res.send(res.locals.unologin.user);
});

app.get('/me/profile', (req, res, next) => 
{
  // the user token contains information such as the id and user classes
  // which is sufficient for most applications, but lacks profile information and metadata
  const userToken = res.locals.unologin.user;

  // profile information can be retrieved using the REST API like this:
  unologin.rest.getUserDocument(userToken)
    .then((user) => res.send(user))
    .catch((e) => next(e));
});

// create an endpoint to query your users
// in most scenarios, you would not want to publicly list all your users
app.get('/users', (req, res, next) => 
{
  // create a GetCursor for users matching the query
  const cursor = unologin.rest.getUserDocuments(
    new URLSearchParams(req.query),
  );

  if (req.query.all)
  {
    // send all users in a single request
    // in practice, this approach should also not be used as cursor.toArray()
    // will aggregate ALL users matching the query into a single array.
    cursor.toArray()
      .then((users) => res.send(users))
      .catch((e) => next(e));
  }
  else 
  {
    // this will send a subset of the users along with a continuation token
    // the token can then be used to fetch the next page via
    // GET /users/?after=${continuationToken}
    cursor.nextBatch()
      .then((batch) => res.send(batch))
      .catch((e) => next(e));
  }
});

// the logoutHandler will delete all login related cookies and then call next()
// this means that you have to call res.send() yourself
app.post('/logout', logoutHandler, function(req, res)
{
  res.send('We hope to have you back soon!');
});

const port = process.env.PORT || 8081;

app.listen(port, () => 
{
  console.log('Example app listening on port ' + port);
});
