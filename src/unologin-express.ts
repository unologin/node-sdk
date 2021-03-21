
import { getOptions, verifyLoginToken } from './api';

import { Request, Response, NextFunction } from 'express';

// not using "next" on auth errors because the request MUST be blocked
type AuthErrorHandler = (
  req : Request,
  res : Response,
) => unknown;

let authErrorHandler : AuthErrorHandler = (req, res) =>
{
  res.status(401);
  res.send(res.locals.unologin?.msg || 'unknown error');
};

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
  
  if (token)
  {
    const { user, msg } = await verifyLoginToken(token);
    
    if (user)
    {
      res.locals.unologin.user = user;

      next();
    }
    else
    {
      res.locals.unologin.msg = msg;

      await authErrorHandler(req, res);
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
 */
export async function loginEventHandler(
  req : Request,
  res : Response,
)
{
  // token provided by the user
  const token = req.query.token as string;

  // verify the login token
  const { user, msg } = await verifyLoginToken(token);

  // the token is valid
  if (user)
  {
    res.cookie(
      '_uno_appLoginToken',
      token,
      {
        // disallow any scripts to read the cookie
        httpOnly: true,
        // enable the cookie for certain domains
        domain: getOptions().cookiesDomain,
      },
    );

    res.cookie(
      '_uno_loginState',
      'success',
      {
        // allow scripts to read the cookie
        httpOnly: false,
        // enable the cookie for certain domains
        domain: getOptions().cookiesDomain,
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
