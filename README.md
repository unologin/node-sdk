Node.js library for interfacing with [unolog·in](https://unolog.in). Includes [express](https://expressjs.com/)-handlers.

The full documentation for this package can be found [here](https://unologin.github.io/node-api/).

Visit [our documentation page](https://dashboard.unolog.in/docs) for more docs & guides.

# Installation

```
npm install @unologin/node-api
```

or

```
yarn add @unologin/node-api
```

# Typescript

The package includes built-in type declarations. There is no need to install any additional packages.

The below examples will use plain javascript for generality.

# Setup

Before using the library, make sure to set up your credentials.

```javascript
const unologin = require('@unologin/node-api');

unologin.setup(
  {
    // your unolog·in api key goes here
    apiKey: process.env.UNOLOGIN_API_KEY,
    // domain(s) on which to set cookies
    cookiesDomain: process.env.UNOLOGIN_COOKIES_DOMAIN,
  },
);
```

# REST API

The library includes bindings for the [unolog·in REST API](https://dashboard.unolog.in/docs/http-api) through the exported ```rest``` object.

More elaborate working examples can be found in ```example/main.js``` in this repository.

### Getting details for a single user

```javascript
const unologin = require('@unologin/node-api');

// user token may be retrieved using 
// userToken = res.locals.unologin.user in express

// returns Promise<UserDocument> (see types)
// which includes all information the user 
// has shared with your app
const user = unologin.rest.getUser(userToken);

```

## Querying users

You can query you app's users using [this query schema](https://v1.unolog.in/schemas/apps/:appId/users/query). Omitting the query will return a cursor for all users.

```javascript
const unologin = require('@unologin/node-api');

// pass an optional query (object or URLSearchParams)
// returns a GetCursor instance which can be used to iterate over users
const cursor = unologin.rest.getUsers(query)

// returns Promise<GetCursorBatch>
// which represents a subset of all users matching the query
// see example/main.js for an example on iterating this way
cursor.nextBatch()

// returns Promise<UserDocument | null>
cursor.next()

// runs the callback function for every
// user matching the query
// returns Promise<void>
cursor.forEach((user) => console.log(user))

// turns the cursor into an array 
// this is not recommended for larger queries
// returns Promise<UserDocument[]>
cursor.toArray()
```

# Usage with [express.js](https://expressjs.com/)

We have built some handlers for you to set up unolog·in on your server with only a few lines of code. 

A full working example can be seen in the ```./example``` directory. Run using

```
npm run example
```

```
yarn run example
```

# Express setup

The next steps are going to assume that you have an express application or router to attach the provided handlers to.

**IMPORTANT:** Add a cookie-parser before adding any unolog·in handler!

```javascript
const cookieParser = require('cookie-parser');

app.use(cookieParser());
```

# Testing locally

When working on your local server, you likely won't connect through ```https``` but ```http```. To be able to still use login cookies, disable the use of secure cookies. The library will refuse to perform this action if ```process.env.NODE_ENV``` is anything but ```'development'```.

```javascript
// IMPORTANT: only do this when testing on your local server!
unologin.express.debug_useSecureCookies(false);
```

## Important note on ```localhost```

In order to make the cookies behave correctly, it is recommended that you use a subdomain of ```localhost``` to access your front- and backend implementations. Most browsers will be able to resolve arbitrary subdomains of ```localhost```.

**Cookies may be rejected by your browser otherwise!**

For example: 

```
Server: my-app.localhost:8080
Frontend: my-app.localhost:8081
# then in your .env
UNOLOGIN_COOKIES_DOMAIN=my-app.localhost
```


# Handling the login event

After going through the login/registration steps, your users will be redirected to your login handler. Be sure to register your login handler in the developer dashboard. To handle the login event, add the ```loginEventHandler``` middleware.

```javascript
app.use('/unologin/login', unologin.express.loginEventHandler);
```

# Logout

To log out the user, use the ```logoutHandler``` middleware. Note that the middleware won't emit a response. It is up to you to do that.

```javascript
app.post(
  '/logout', 
  unologin.express.logoutHandler, 
  function(req, res)
  {
    // send a response to terminate the request
    res.send('We hope to have you back soon!');
  }
);
```

Alternatively, call ```logoutHandler``` as a function:
```javascript
app.post('/logout', function(req, res)
{
  // same effect as above
  unologin.express.logoutHandler(req, res);

  // send a response to terminate the request
  res.send('We hope to have you back soon!');
});
```

# Using ```parseLogin``` and ```requireLogin```

Use the ```parseLogin``` middleware to parse the login token sent by the user and validate it. 

**IMPORTANT:** This does **not** require a login token to be present to call the following handlers! (see ```requireLogin```) 

```javascript
// parsing login token everywhere 
app.use('*', unologin.express.parseLogin);

// example of accessing the user data
app.get('/me', function(req, res) => 
{
  // keep in mind that `user` may be undefined
  res.send(res.locals.unologin.user)
});
```

Use the ```requireLogin``` middleware where it is absolutely required for users to be logged in.

**IMPORTANT:** ```requireLogin``` **must** be preceeded by ```parseLogin```!

```javascript
app.use('/my-personal-photos', unologin.express.parseLogin);

// require your users to be logged in to access this route
app.use('/my-personal-photos', unologin.express.requireLogin);
```


# Error handling (optional)

Decide what happens when an authentication error is thrown. This happens if

1. ```requireLogin``` is active and **no login token** is sent
2. ```parseLogin``` is active and an **invalid token** is sent

The below implementation is actually the default behavior. If you are fine with the default behavior, you may skip this step. 
```javascript
onAuthError(function(req, res)
{
  unologin.express.logoutHandler(req, res);
  res.status(401);
  res.send(
      'Auth error: ' + res.locals.unologin?.msg ||
      'unknown error'
  );
});
```