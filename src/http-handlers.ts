
import type {
  CookieOptions,
  NextFunction,
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
  UserToken,
} from './types';

type Request = ExpressRequest | NextApiRequest;
type Response = ExpressResponse | NextApiResponse;

// not using "next" on auth errors because the request MUST be blocked
export type AuthErrorHandler = (
  req : Request,
  res : Response,
  error : APIError,
) => unknown | Promise<unknown>;

export type LoginSuccessHandler = (
  req : Request,
  res : Response,
  user : UserToken,
) => unknown | Promise<unknown>;

/**
 * HTTP handlers for ExpressJS and NextJS.
 */
export default abstract class HttpHandlers
{
  protected loginSuccessHandler : LoginSuccessHandler | null = null;

  /**
   * 
   * @param req req
   * @param res res
   * @param error error
   * @returns void
   */
  protected authErrorHandler : AuthErrorHandler = (req, res, error) =>
  {
    this.resetLoginCookies(res);
  
    res.status(401);
    res.send('Auth error: ' + error.message || 'unknown error');
  };
  
  /** Should cookies use the "secure" attribute? */
  private useSecureCookies = true;
  
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
   * Completes cookie options
   * @param opts cookie options
   * @returns default cookie options
   */
  completeCookieOptions(opts : CookieOptions) : CookieOptions
  {
    const cookie : CookieOptions =
    {
      ...opts,
      domain: this.client.getOptions().cookiesDomain,
      // always use secure cookies if not in dev environment
      // this is redundant as debug_useSecureCookies will be ignored but it won't hurt
      secure: this.useSecureCookies || (process.env.NODE_ENV !== 'development'),

      // [!] TODO: (UN-72) using 'none' is a temporary fix for the behavior of omitting sameSite on chrome
      sameSite: this.client.getOptions().cookieSameSite || 'none',
    };

    if (cookie.maxAge === undefined)
    {
      delete cookie.maxAge;
    }

    return cookie;
  }

  
  /**
   * Decide what to do on auth error. 
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
   * Add a hook that is called after the login event has finished but before the response is sent to the client. 
   * 
   * 
   * {@link getUserToken}(res) will be available regardless of {@link parseLogin}.
   * 
   * @param handler Express handler, may be asynchronous
   * @returns void
   */
  public onLoginSuccess(
    handler: LoginSuccessHandler,
  ) : void
  {
    this.loginSuccessHandler = handler;
  }

  abstract setCookie(
    res : Response,
    name : string,
    value : string,
    options : CookieOptions,
  ) : void;

  /**
   * 
   * @param res rest
   * @param cookie cookie to set
   * @param options cookie options
   * @returns void
   */
  setLoginCookies(
    res : Response,
    cookie : LoginCookie,
    options : CookieOptions = {},
  ) 
  {
    this.setCookie(
      res,
      this.cookies.login.name,
      cookie.value,
      {
        maxAge: cookie.maxAge,
        ...this.cookies.login.options,
        ...this.completeCookieOptions(options),
      },
    );

    this.setCookie(
      res,
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
   * @param res res
   * @returns void
   */
  resetLoginCookies(res : Response) : void
  {
    // reset the cookie by immediately expiring it
    this.setLoginCookies(
      res,
      // maxAge: 0 has shown weird behavior
      { value: 'deleted', maxAge: 1 },
    );
  }

  /**
   * Populates {@link getUserToken} with the user token if the user is logged in.
   * Does nothing if no login cookie is present.
   * Requires a cookie parser.
   * 
   * TODO: Move express-logic to express-handlers!
   * 
   * @param req request
   * @param res response
   * @param next optional next function
   * @returns Promise<UserToken>
   */
  public async parseLogin<Next extends NextFunction | undefined>(
    req : Request,
    res : Response,
    next?: Next,
  ) : Promise<UserToken | null>
  {
    const token = req.cookies?.[this.cookies.login.name];

    if (next)
    {
      (res as unknown as ExpressResponse).locals.unologin ||= {};
    }

    // only try to parse the token if the user provides one
    if (token)
    {
      try
      {
        const [user, cookie] = await this.client.verifyTokenAndRefresh(token);
        
        // cookie has been refreshed
        if (cookie)
        {
          this.setLoginCookies(res, cookie);
        }

        if (next)
        {
          (res as unknown as ExpressResponse).locals.unologin.user = user;
          next();
        }

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

        if (next)
        {
          return null;
        }
        else 
        {
          throw e;
        }
      }
    }

    next?.();

    return null;
  }

  /**
   * 
   * Populates {@link getUserToken} with the user token if the user is logged in.
   * Does nothing if no login cookie is present.
   * Requires a cookie parser.
   * 
   * @param req req
   * @param res res
   * @returns url to redirect the user to
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

      cookie && this.setLoginCookies(res, cookie);
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
      decodeURIComponent(req.query.origin as string) || 
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
