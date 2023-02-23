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

/**
 * Implements HttpHandlers for Express.
 */
export default class ExpressHandlers
  extends HttpHandlers<Request, Response>
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
   * 
   * Middleware to parse login information.
   * 
   * Will let any request pass where the user is not logged in.
   * 
   * @see {requireLogin} for making sure only authenticated requests get past.
   * 
   * @param req request
   * @param res response
   * @param next optional next function
   * @returns Promise<UserToken | null>
   */
  public async parseLogin(
    req : Request,
    res : Response,
    next : NextFunction,
  ) : Promise<void>
  {
    try 
    {
      // will throw if invalid
      await this.getUserTokenOptional(
        req, 
        res,
      );

      next();
    }
    catch (e)
    {
      if (
        !(e instanceof APIError) || 
        !(e.isAuthError())
      )
      {
        next(e);
      }
    }
  }

  /**
   * Logs out a user and calls next()
   * 
   * @param req req 
   * @param res res
   * @param next next
   * @returns Promise<void>
   */
   public logoutHandler = async (
     req : Request, 
     res : Response, 
     next?: NextFunction,
   ) => 
   {
     this.resetLoginCookies(req, res);
  
     next?.();
   };

  /**
   * Express wrapper for {@link http-handlers.HttpHandlers.handleLoginEvent}.
   * 
   * @see {@link http-handlers.HttpHandlers.handleLoginEvent}
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
   * @param _ req (not used)
   * @param res res
   * @param name name
   * @param value value
   * @param options options
   * @returns void
   */
  setCookie(
    _ : Request,
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
   * Extracts the cached UserToken from previous call to 
   * {@link getUserTokenOptional} or {@link getUserToken}
   * 
   * Returns null if not logged in.
   * 
   * Will only return the token if preceded by {@link parseLogin} or in {@link onLoginSuccess}.  
   * Will return ```null``` otherwise.
   * 
   * Use {@link getUserToken} for an authenticated async version.
   * 
   * @param res Express Response object
   * @returns {UserToken | null} token 
   */
  getUserTokenSync(res : Response) : UserToken | null
  {
    const cached = super.getCachedUserToken(res);

    if (cached)
    {
      return cached;
    }
    else if (!res.locals.unologin?.parseLoginCalled)
    {
      throw new Error(
        'Cannot use getUserTokenSync/requireLogin without parseLogin.',
      );
    }
    else 
    {
      return null;
    }
  }

  /**
   * 
   * Only executes the next handler if the user is logged in.
   * 
   * Will trigger the {@link AuthErrorHandler} otherwise. 
   * 
   * *Must* be preceded by the {@link parseLogin} middleware.
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
    if (this.getUserTokenSync(res))
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
