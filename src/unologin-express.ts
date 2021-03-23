
import { getOptions, verifyLoginToken } from './main';

import { Request, Response, NextFunction, CookieOptions } from 'express';

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
      // always use secure cookies if not in dev environment
      // this is redundant as debug_useSecureCookies will be ignored but it won't hurt
      secure: useSecureCookies || (process.env.NODE_ENV !== 'development'),
    },
  },
  // login state for client scripts to read
  loginState:
  {
    name: '_uno_loginState',
    options: <CookieOptions>
    {
      httpOnly: false,
      secure: useSecureCookies || (process.env.NODE_ENV !== 'development'),
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
  return { ...opts, domain: getOptions().cookiesDomain };
}

// not using "next" on auth errors because the request MUST be blocked
type AuthErrorHandler = (
  req : Request,
  res : Response,
) => unknown | Promise<unknown>;

let authErrorHandler : AuthErrorHandler = (req, res) =>
{
  logoutHandler(req, res);

  res.status(401);
  res.send('Auth error: ' + res.locals.unologin?.msg || 'unknown error');
};

/**
 * [FOR LOCAL TESTING ONLY] allows to enable/disable secure cookies.
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
      console.log(
        '\x1b[31m',
        '[UNOLOGIN EXPRESS] SECURE COOKIES HAVE BEEN DISABLED.\n' +
        '                   DO THIS FOR LOCAL TESTING ONLY!',
      );
    }
  }
  else 
  {
    console.log(
      '\x1b[31m',
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
 * Adds "user"-key to res.locals.unologin Requires a cookie parser.
 * Does nothing if no login cookie is present.
 * 
 * @param req express request
 * @param res express result
 * @param next express next
 * 
 * @returns void
 */
export async function parseLogin(
  req : Request,
  res : Response,
  next : NextFunction,
) : Promise<void>
{

  const token = req.cookies?._uno_appLoginToken;

  res.locals.unologin ||= {};
  
  // only try to parse the token if the user provides one
  if (token)
  {
    try
    {
      res.locals.unologin.user = await verifyLoginToken(token);

      next();
    }
    catch (e)
    {
      if (e.isAuthError?.())
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
}

/**
 * Only executes next() if the user is logged in.
 * Requires parseLogin middleware
 * 
 * @param req express req
 * @param res express res
 * @param next express next
 * @returns void
 */
export async function requireLogin(
  req : Request,
  res : Response,
  next : NextFunction,
)
{
  const { user } = res.locals.unologin;

  if (user)
  {
    next();
  }
  else
  {
    await authErrorHandler(req, res);
  }
}

/**
 * Express middleware for handling the login process.
 * 
 * @param req express req
 * @param res express res
 * @param next express next
 * @returns void
 */
export async function loginEventHandler(
  req : Request,
  res : Response,
  next : NextFunction,
)
{
  // token provided by the user
  const token = (req.query.token || req.body.token) as string;

  // verify the login token
  let user;
  let msg;

  try
  {
    user = await verifyLoginToken(token);
  }
  catch (e)
  {
    if (e.isAuthError?.())
    {
      msg = e.message;
    }
    else
    {
      next(e);
      return;
    }
  }

  // the token is valid
  if (user)
  {
    // [!] TODO: expiration
    res.cookie(
      cookies.login.name,
      token,
      {
        ...completeCookieOptions(cookies.login.options),
      },
    );

    res.cookie(
      cookies.loginState.name,
      'success',
      {
        ...completeCookieOptions(cookies.loginState.options),
      },
    );
  }

  // construct a url for the unologin front end to consume the result
  const url = new URL(
    '/login-response?success=' + !!user + '&msg=' + msg,
    getOptions().realm.frontendUrl,
  );

  res.redirect(url.href);

  res.send();
}

/**
 * Logs out a user and calls next()
 * 
 * @param req express 
 * @param res express
 * @param next express
 * @returns void
 */
export function logoutHandler(
  req : Request,
  res : Response,
  next?: NextFunction,
)
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
}
