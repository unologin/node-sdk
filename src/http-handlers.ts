/**
 * @module http-handlers
 * 
 */

import type {
  CookieOptions,
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';

import type {
  NextApiRequest,
  NextApiResponse,
} from 'next';

import {
  APIError,
} from './errors';

import {
  IUnologinClient,
  LoginCookie,
  UserHandle,
  UserToken,
} from './types';

export type ExpressOrNextRequest = ExpressRequest | NextApiRequest;
export type ExpressOrNextResponse = ExpressResponse | NextApiResponse;

// not using "next" on auth errors because the request MUST be blocked
export type AuthErrorHandler<
Request extends ExpressOrNextRequest = ExpressOrNextRequest,
Response extends ExpressOrNextResponse = ExpressOrNextResponse
> = (
  req : Request,
  res : Response,
  error : APIError,
) => unknown | Promise<unknown>;

export type LoginSuccessHandler<
Request extends ExpressOrNextRequest = ExpressOrNextRequest,
Response extends ExpressOrNextResponse = ExpressOrNextResponse
> = (
  req : Request,
  res : Response,
  user : UserToken,
) => unknown | Promise<unknown>;

/**
 * Low-level HTTP request handlers and utility functions
 * that can be used by Express, Next, or other server frameworks.
 * 
 */
export abstract class HttpHandlers<
  Request extends ExpressOrNextRequest = ExpressOrNextRequest,
  Response extends ExpressOrNextResponse = ExpressOrNextResponse
>
{
  protected loginSuccessHandler : LoginSuccessHandler | null = null;

  /**
   * Executed when encountering an authentication error.
   * 
   * @see {@link errors.APIError.isAuthError}
   * 
   * @param req req
   * @param res res
   * @param error error
   * @returns void
   */
  protected authErrorHandler : AuthErrorHandler<Request, Response> = 
  (req, res, error) =>
  {
    this.resetLoginCookies(req, res);
  
    res.status(401);
    res.send('Auth error: ' + error.message || 'unknown error');
  };
  
  /** List of cookies used and their default options. */
  private cookies =
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
   * @param client unologin instance
   */
  constructor(public readonly client : IUnologinClient) {}

  /**
   * Completes cookie options.
   * @param opts cookie options
   * @returns default cookie options
   */
  completeCookieOptions(opts : CookieOptions) : CookieOptions
  {
    const {
      cookiesDomain,
      disableSecureCookies,
      cookieSameSite,
    } = this.client.getOptions();

    const cookie : CookieOptions =
    {
      ...opts,
      domain: cookiesDomain,
      // always use secure cookies if not in dev environment
      // this is redundant as debug_useSecureCookies will be ignored but it won't hurt
      secure: !disableSecureCookies || (process.env.NODE_ENV !== 'development'),

      // [!] TODO: (UN-72) using 'none' is a temporary fix for the behavior of omitting sameSite on chrome
      sameSite: cookieSameSite || 'none',
    };

    if (cookie.maxAge === undefined)
    {
      delete cookie.maxAge;
    }

    return cookie;
  }
  
  /**
   * Result of {@link getUserTokenOptional} may be stored in with the response object.
   * 
   * This function acts as a helper to retrieve the cached value.
   * 
   * This function is meant to be used in conjunction with Express-like frameworks
   * where one middleware function is called after another, 
   * passing values using ```res.locals```.
   * 
   * @internal
   * 
   * @see {@link setCachedUserToken}
   * 
   * @param res res
   * @returns parsed user token cached in ```res.locals```
   */
  protected getCachedUserToken(res : Response) : UserToken | null
  {
    return (res as ExpressResponse).locals?.unologin?.user || null;
  }

  /**
   * 
   * @see {@link getCachedUserToken}
   * @param res res
   * @param userToken token or null
   * 
   * @returns void
   */
  protected setCachedUserToken(
    res : Response,
    userToken : UserToken | null,
  )
  {
    (res as any).locals ||= {};
    const locals = (res as any).locals;

    locals.unologin ||= {};

    locals.unologin.user = userToken;

    locals.unologin.parseLoginCalled = true;
  }

  /**
   * Returns a {@link types.UserHandle} from the current request.
   * Returns ```null``` if the request contains no login information.
   * 
   * **IMPORTANT**:
   * 
   * This function is synchronous and the UserHandle can 
   * therefore not be trusted to be authenticated.
   * 
   * The returned UserHandle **can** however be used in any API call that accepts a UserHandle
   * as a parameter.
   * 
   * In this case, the authentication happens on the unologin API.
   * 
   * Use {@link getUserTokenOptional} for optional authentication.
   * Use {@link getUserToken} for required authentication.
   * 
   * @param req req
   * @param res res
   * @returns UserHandle | null
   */
  public getUserHandleNoAuth(req : Request, res : Response) : UserHandle | null
  {
    const cachedUser = this.getCachedUserToken(res);

    if (cachedUser)
    {
      return cachedUser;
    }
    else 
    {
      const appLoginToken = req.cookies[this.cookies.login.name];

      if (appLoginToken)
      {
        return { appLoginToken };
      }
    }

    return null;
  }

  /**
   * Authenticates the user and returns a Promise to the {@link types.UserToken}.
   * 
   * Requires the user to be logged in.
   * 
   * The resolved {@link types.UserToken} is authenticated and *can be trusted*.
   * 
   * @see {@link getUserTokenOptional} for optional authentication.
   * 
   * @throws {@link errors.APIError} 403 unauthorized if not logged in.
   * @throws {@link errors.APIError} 403 unauthorized if login token invalid.
   * 
   * @param req req
   * @param res res
   * 
   * @returns Promise<UserToken>
   */
  public async getUserToken(
    req : Request, 
    res : Response,
  ) : Promise<UserToken>
  {
    const userToken = await this.getUserTokenOptional(req, res);

    if (userToken)
    {
      return userToken;
    }
    else 
    {
      throw new APIError(
        401,
        'Login required.',
        { param: 'user'},
      );
    }
  }

  /**
   * Authenticates the user and returns a Promise to the {@link types.UserToken}.
   * 
   * Does not require the user to be logged in. 
   * Does nothing if no login cookie is present and returns null.
   * 
   * The resolved {@link types.UserToken} is authenticated and *can be trusted* if not null.
   * 
   * Requires a cookie parser.
   * 
   * @see {@link getUserToken} for required authentication.
   * 
   * @param req req
   * @param res res
   * @returns Promise<UserToken>
   */
  public async getUserTokenOptional(req : Request, res : Response)
  {
    const cached = this.getCachedUserToken(res);
  
    if (cached)
    {
      return cached;
    }

    const token = req.cookies?.[this.cookies.login.name];
  
    // only try to parse the token if the user provides one
    if (token)
    {
      try
      {
        const [user, cookie] = await this.client.verifyTokenAndRefresh(token);
        
        // cookie needs to be refreshed
        if (cookie)
        {
          this.setLoginCookies(req, res, cookie);
        }
        
        this.setCachedUserToken(res, user);

        return user;
      }
      catch (e)
      {
        if (
          e instanceof APIError && e.isAuthError?.()
        )
        {
          await this.authErrorHandler(req, res, e);
        }

        this.setCachedUserToken(res, null);

        throw e;
      }
    }

    this.setCachedUserToken(res, null);

    return null;
  }

  
  /**
   * Decide what to do on auth error. 
   * 
   * @see {authErrorHandler}
   * 
   * @param handler Express handler
   * @returns void
   */
  public onAuthError(
    handler: AuthErrorHandler,
  ) : void
  {
    this.authErrorHandler = handler;
  }


  /**
   * Add a callback that is called after the login event has 
   * finished but before the response is sent to the client. 
   * 
   * The {@link types.UserToken} passed to ```handler```
   * is authenticated an *can be trusted*.
   * 
   * @param handler (req, res, userToken) => unknown
   * @returns void
   */
  public onLoginSuccess(
    handler: LoginSuccessHandler,
  ) : void
  {
    this.loginSuccessHandler = handler;
  }

  /**
   * Framework specific implementation required. 
   * 
   * @internal
   * 
   * @param req req
   * @param res res
   * @param name name
   * @param value value
   * @param options cookie options
   */
  protected abstract setCookie(
    req : Request,
    res : Response,
    name : string,
    value : string,
    options : CookieOptions,
  ) : void;

  /**
   * Set the login cookies for a response.
   * 
   * @internal
   * 
   * @param req req
   * @param res rest
   * 
   * @param cookie cookie to set
   * @param options cookie options
   * @returns void
   */
  protected setLoginCookies(
    req : Request,
    res : Response,
    cookie : LoginCookie,
    options : CookieOptions = {},
  ) 
  {
    this.setCookie(
      req, res,
      this.cookies.login.name,
      cookie.value,
      {
        maxAge: cookie.maxAge,
        ...this.cookies.login.options,
        ...this.completeCookieOptions(options),
      },
    );

    this.setCookie(
      req, res,
      this.cookies.loginState.name,
      'success',
      {
        maxAge: cookie.maxAge,
        ...this.cookies.loginState.options,
        ...this.completeCookieOptions(options),
      },
    );
  }

  /**
   * Resets/deletes login cookies.
   * 
   * @param req req
   * @param res res
   * @returns void
   */
  protected resetLoginCookies(req : Request, res : Response) : void
  {
    // reset the cookie by immediately expiring it
    this.setLoginCookies(
      req, res,
      // maxAge: 0 has shown weird behavior
      { value: 'deleted', maxAge: 1 },
    );
  }

  /**
   * Handles the unologin login event. 
   * Returns a URL to redirect the user to.
   * 
   * @internal
   * 
   * @param req req
   * @param res res
   * @returns Promise<URL> to redirect the user to
   */
  async handleLoginEvent(req : Request, res : Response)
  {
    // token provided by the user
    const token = (req.query.token || req.body.token) as string;
    
    // error message in case an error occurs
    let msg : string | null = null;
    
    try
    {
      // verify the login token
      const [userToken, cookie] = await this.client.verifyTokenAndRefresh(
        token,
        // force refresh token on login
        true,
      );

      await this.loginSuccessHandler?.(req, res, userToken);

      cookie && this.setLoginCookies(req, res, cookie);
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
        throw e;
      }
    }

    // construct a url for the unologin front end to consume the result
    const url = new URL(
      req.query.origin && decodeURIComponent(req.query.origin as string) || 
      this.client.getOptions().realm.frontendUrl,
    );

    url.searchParams.set('loginHandlerSuccess', msg ? 'false' : 'true');
    msg && url.searchParams.set('loginHandlerMsg', msg);
    url.searchParams.set('appId', this.client.getOptions().appId);
    url.searchParams.set('client', 'Web');

    return {
      url,
    };
  }
}

export default HttpHandlers;
