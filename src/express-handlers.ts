/**
 * Exports [express.js](https://expressjs.com/) handlers and utility.
 * 
 * Example of a fully configured express server using unolog·in.
 * 
 * ```javascript
 * [[include:example/example-express-server.js]]
 * ```
 * 
 * @module express-handlers
 */

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

import {
  IUnologinClient,
  UserToken,
} from './types';

import HttpHandlers from './http-handlers';

// not using "next" on auth errors because the request MUST be blocked
export type AuthErrorHandler = (
  req : Request,
  res : Response,
) => unknown | Promise<unknown>;

export type LoginSuccessHandler = (
  req : Request,
  res : Response
) => unknown | Promise<unknown>;

/**
 * Implements HttpHandlers for Express.
 */
export default class ExpressHandlers
  extends HttpHandlers
{
  /**
   * 
   * @param client client
   * 
   */
  constructor(client : IUnologinClient)
  {
    super(client);

    // the following functions were previously exported from the module
    // and not member of a class
    // some documentation includes de-structuring of unologin.express
    // which is why these functions need to be bound to this
    this.onAuthError = this.onAuthError.bind(this);
    this.parseLogin = this.parseLogin.bind(this);
    this.requireLogin = this.requireLogin.bind(this);
    this.loginEventHandler = this.loginEventHandler.bind(this); 
    this.logoutHandler = this.logoutHandler.bind(this);
    this.getUserToken = this.getUserToken.bind(this);
  }

  /**
   * Logs out a user and calls next()
   * 
   * @param _ req 
   * @param res res
   * @param next next
   * @returns Promise<void>
   */
   public logoutHandler = async (
     _ : Request, 
     res : Response, 
     next?: NextFunction,
   ) => 
   {
     this.resetLoginCookies(res);
  
     next?.();
   };

  /**
   * Express wrapper for {@link HttpHandlers.handleLoginEvent}.
   * 
   * @see {@link HttpHandlers.handleLoginEvent}
   * 
   * @param req req
   * @param res res
   * @param next next
   * @returns Promise<void>
   */
  public readonly loginEventHandler : Handler = async (req, res) => 
  {
    const { url } = await this.handleLoginEvent(req, res);
  
    res.redirect(url.href);
  
    res.send();
  }
  
  /**
   * Implements cookie setting for Express.
   * @param res res
   * @param name name
   * @param value value
   * @param options options
   * @returns void
   */
  setCookie(
    res : Response,
    name : string,
    value : string,
    options : CookieOptions,
  ) 
  {
    res.cookie(
      name,
      value,
      options,
    );
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
  getUserToken(res : Response) : UserToken | null
  {
    return res.locals.unologin?.user || null;
  }

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
  public readonly requireLogin : Handler = async (req, res, next) => 
  {
    if (this.getUserToken(res))
    {
      next();
    }
    else
    {
      await this.authErrorHandler(
        req, 
        res, 
        new APIError(401, 'Login required.', null),
      );
    }
  };
}
