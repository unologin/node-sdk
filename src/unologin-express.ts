/**
 * Exports [express.js](https://expressjs.com/) handlers and utility.
 * 
 * Example of a fully configured express server using unolog·in.
 * 
 * ```javascript
 * [[include:example/example-express-server.js]]
 * ```
 * 
 * @module express
 */

import {
  Cookie,
  getOptions,
  verifyTokenAndRefresh,
} from './main';

import {
  Request,
  Response,
  CookieOptions,
  Handler,
  NextFunction,
} from 'express';

import {
  APIError,
} from './errors';
import { UserToken } from './types';

// should cookies use the "secure" attribute?
let useSecureCookies = true;

// default cookie options
const cookies =
{
  // secure session cookie for the server to read
  login: 
  {
    name: '_uno_appLoginToken',
    options: <CookieOptions>
    {
      httpOnly: true,
    },
  },
  // login state for client scripts to read
  loginState:
  {
    name: '_uno_loginState',
    options: <CookieOptions>
    {
      httpOnly: false,
    },
  },
};

/**
 * Completes cookie options
 * @param opts cookie options
 * @returns default cookie options
 */
function completeCookieOptions(opts : CookieOptions) : CookieOptions
{
  const cookie : CookieOptions =
  {
    ...opts,
    domain: getOptions().cookiesDomain,
    // always use secure cookies if not in dev environment
    // this is redundant as debug_useSecureCookies will be ignored but it won't hurt
    secure: useSecureCookies || (process.env.NODE_ENV !== 'development'),

    // [!] TODO: (UN-72) using 'none' is a temporary fix for the behavior of omitting sameSite on chrome
    sameSite: getOptions().cookieSameSite || 'none',
  };

  if (cookie.maxAge === undefined)
  {
    delete cookie.maxAge;
  }

  return cookie;
}

// not using "next" on auth errors because the request MUST be blocked
export type AuthErrorHandler = (
  req : Request,
  res : Response,
) => unknown | Promise<unknown>;

export type LoginSuccessHandler = (
  req : Request,
  res : Response
) => unknown | Promise<unknown>;

let authErrorHandler : AuthErrorHandler = (req, res) =>
{
  logoutHandler(req, res);

  res.status(401);
  res.send('Auth error: ' + res.locals.unologin?.msg || 'unknown error');
};

let loginSuccessHandler : LoginSuccessHandler | null = null;


/**
 * Enable/disable secure cookies.
 * 
 * Calls will be ignored with a warning unless ```process.env``` is set to ```'development'```
 * 
 * You should *always* use secure cookies in production!
 * 
 * @param b useSecureCookies
 * @returns void
 */
export function
// eslint-disable-next-line camelcase
debug_useSecureCookies(b : boolean)
{
  if (process.env.NODE_ENV === 'development')
  {
    useSecureCookies = b;

    if (!b)
    {
      console.warn(
        '\x1b[31m%s\x1b[0m',
        '[UNOLOGIN EXPRESS] SECURE COOKIES HAVE BEEN DISABLED.\n' +
        '                   DO THIS FOR LOCAL TESTING ONLY!',
      );
    }
  }
  else 
  {
    console.warn(
      '\x1b[31m%s\x1b[0m',
      '[UNOLOGIN EXPRESS] REFUSING debug_useSecureCookies call.\n' +
      '                   NODE_ENV != "development"!',
    );
  }
}

/**
 * Decide what to do on auth error. 
 * 
 * @param handler Express handler
 * @returns void
 */
export function onAuthError(
  handler: AuthErrorHandler,
) : void
{
  authErrorHandler = handler;
}


/**
 * Add a hook that is called after the login event has finished but before the response is sent to the client. 
 * 
 * 
 * {@link getUserToken}(res) will be available regardless of {@link parseLogin}.
 * 
 * @param handler Express handler, may be asynchronous
 * @returns void
 */
export function onLoginSuccess(
  handler: LoginSuccessHandler,
) : void
{
  loginSuccessHandler = handler;
}

/**
 * Extracts the UserToken from res.locals.unologin. 
 * 
 * Returns null if not logged in.
 * 
 * Will only return the token if preceded by {@link parseLogin} or in {@link onLoginSuccess}. Will return ```null``` otherwise.
 * 
 * @param res Express Response object
 * @returns {UserToken | null} token 
 */
export function getUserToken(res : Response) : UserToken | null
{
  return res.locals.unologin?.user || null;
}

/**
 * Populates {@link getUserToken} with the user token if the user is logged in.
 * Does nothing if no login cookie is present.
 * Requires a cookie parser.
 * 
 * @param req req 
 * @param res res
 * @param next next
 * @returns Promise<void>
 */
export const parseLogin : Handler = async (req, res, next) =>
{
  const token = req.cookies?._uno_appLoginToken;

  res.locals.unologin ||= {};
  
  // only try to parse the token if the user provides one
  if (token)
  {
    try
    {
      const [user, cookie] = await verifyTokenAndRefresh(token);
      
      // cookie has been refreshed
      if (cookie)
      {
        setCookies(res, cookie);
      }

      res.locals.unologin.user = user;

      next();
    }
    catch (e)
    {
      if (
        e instanceof APIError && e.isAuthError?.()
      )
      {
        res.locals.unologin.msg = e.message;
        
        await authErrorHandler(req, res);
      }
      else
      {
        // pass the error to the express error handler
        next(e);
      }
    }
  }
  else 
  {
    next();
  }
};

/**
 * 
 * Only executes the next handler if the user is logged in.
 * 
 * Will trigger the {@link AuthErrorHandler} otherwise. 
 * 
 * Requires the {@link parseLogin} middleware mounted before it.
 * 
 * @see {@link onAuthError} to configure the error behavior.
 * 
 * @see {@link parseLogin} middleware
 * 
 * 
 * @param req req 
 * @param res res
 * @param next next
 * @returns Promise<void>
 */
export const requireLogin : Handler = async (req, res, next) => 
{
  if (getUserToken(res))
  {
    next();
  }
  else
  {
    res.locals.unologin.msg = 'not logged in';
    
    await authErrorHandler(req, res);
  }
};

/**
 * Sets login and login state cookies
 * @param res res
 * @param cookie cookie
 * @returns void
 */
function setCookies(
  res : Response,
  cookie : Cookie,
)
{
  res.cookie(
    cookies.login.name,
    cookie.value,
    completeCookieOptions(
      {
        ...cookies.login.options,
        maxAge: cookie.maxAge,
      },
    ),
  );

  res.cookie(
    cookies.loginState.name,
    'success',
    completeCookieOptions(
      {
        ...cookies.loginState.options,
        maxAge: cookie.maxAge,
      },
    ),
  );
}

/**
 * Express middleware for handling the login event.
 * 
 * @see {@link onLoginSuccess} for custom behavior
 * 
 * @param req req 
 * @param res res
 * @param next next
 * @returns Promise<void>
 */
export const loginEventHandler : Handler = async (req, res, next) => 
{
  // token provided by the user
  const token = (req.query.token || req.body.token) as string;

  // error message in case an error occurs
  let msg : string | null = null;

  try
  {
    // verify the login token
    const [userToken, cookie] = await verifyTokenAndRefresh(
      token,
      // force refresh token on login
      true,
    );

    cookie && setCookies(res, cookie);

    res.locals.unologin ||= {};
    res.locals.unologin.user = userToken;
  }
  catch (e)
  {
    if (
      e instanceof APIError &&
      e.isAuthError?.()
    )
    {
      msg = e.msg;
    }
    else
    {
      next(e);
      return;
    }
  }

  // construct a url for the unologin front end to consume the result
  const url = new URL(
    decodeURIComponent(req.query.origin as string) || 
    getOptions().realm.frontendUrl,
  );

  url.searchParams.set('loginHandlerSuccess', msg ? 'false' : 'true');
  msg && url.searchParams.set('loginHandlerMsg', msg);
  url.searchParams.set('appId', getOptions().appId);
  url.searchParams.set('client', 'Web');

  if (!msg && loginSuccessHandler)
  {
    await loginSuccessHandler(req, res);
  }

  res.redirect(url.href);

  res.send();
};

/**
 * Logs out a user and calls next()
 * 
 * @param _ req 
 * @param res res
 * @param next next
 * @returns Promise<void>
 */
export const logoutHandler = async (
  _ : Request, 
  res : Response, 
  next?: NextFunction,
) => 
{
  // reset all cookies
  for (const cookie of Object.values(cookies))
  {
    // reset the cookie by immediately expiring it
    res.cookie(
      cookie.name,
      // replace the value
      'deleted',
      {
        // changing a cookie requires the same options
        ...completeCookieOptions(cookie.options),
        // maxAge: 0 has shown some weird behavior
        maxAge: 1,
      },
    );
  }

  next?.();
};
