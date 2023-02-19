/**
 * Entry point for the @unologin/node-api package.
 * 
 * @module main
 * 
 */

import superagent, {
  SuperAgentRequest,
} from 'superagent';

import ExpressHandlers 
  from './express-handlers';

import {
  APIError,
} from './errors';

import jwt, {
  JsonWebTokenError,
} from 'jsonwebtoken';

import type {
  CookieOptions,
} from 'express';

import type {
  UserToken,
  LoginCookie,
} from './types';

import {
  UnologinRestApi,
} from './rest';

import KeyManager from './key-manager';

/** @hidden @internal */
export const keyManager = new KeyManager(module.exports);

/**
 * REST API instance. 
 * @see {@link rest.UnologinRestApi}
 */
export const rest = new UnologinRestApi(module.exports);

/** @module express */
export const express = new ExpressHandlers(module.exports);

/** @deprecated alias for {@link types.UserToken} */
export type User = UserToken;

/** Defines unolog·in API and frontend URls */
export interface Realm 
{
  apiUrl: string;
  frontendUrl: string;
}

/**
 * Configuration for the API.
 */
export interface Options 
{
  /**
  * API key from [the dashboard](https://dashboard.unolog.in).
  */
  apiKey: string;

  /**
   * Dictates the [Domain](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#domaindomain-value) attribute for authentication cookies.
   * 
   * Example: ```'.example.com'``` 
   */
  cookiesDomain?: string;

  /**
   * Override the [SameSite](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#samesitesamesite-value) attribute for authentication cookies.
   */
  cookieSameSite?: CookieOptions['sameSite'];

  /**
   * Configures the URL of the unolog·in API.
   */
  realm: Realm;

  /**
   * Your appId. Automatically inferred from {@link apiKey}.
   */
  appId: string;

  /**
   * Superagent-like agent. 
   * Pass your own instance of superagent or supertest.
   * 
   * @param method method
   * @param location url
   * @returns SuperAgentRequest
   */
  agent: (method: string, location: string) => SuperAgentRequest;

  /**
   * Disable secure cookies.
   * Will only take effect if ```process.env.NODE_ENV === 'development'```. 
   */
  disableSecureCookies?: boolean;
}


export interface ApiKeyPayload
{
  appId: string;
}

export const realms = 
{
  live: 
  {
    apiUrl: 'https://v1.unolog.in',
    frontendUrl: 'https://login.unolog.in',
  },
};

export const defaultOptions =
{
  realm: realms.live,
  agent: superagent,
};

let options : Options | null = null;

/**
 * @param key api key
 * @returns decoded key (payload)
 */
export function decodeApiKey(key : string | undefined) : ApiKeyPayload
{
  if (!key)
  {
    throw new Error('Invalid unolog.in API key: ' + key);
  }

  // check what type of token is used: legacy base64 token will not contain any dots, while jwts will  
  const payload = key.includes('.') ?
    jwt.decode(key, { json: true }) :
    // legacy base64 signed token
    JSON.parse(
      Buffer.from(key, 'base64').toString(),
    ).payload?.data
  ;

  if (!payload?.appId)
  {
    throw new Error(
      'Invalid unologin API key. Payload: ' + JSON.stringify(payload, null, 2),
    );
  }

  return payload;
}

/**
 * @param opts setup
 * @returns void
 */
export function setup(
  opts : Omit<
    Options, keyof typeof defaultOptions | 'appId'
  > & Partial<Options>,
) : void
{
  try 
  {
    const token = decodeApiKey(opts.apiKey);
    
    const currentOptions = options || defaultOptions;

    options =
    {
      ...currentOptions,
      ...opts,
      appId: token.appId,
    };
  }
  catch (e)
  {
    throw new Error('Malformed API key.');
  }
}

/**
 * @returns setup
 */
export function getOptions() : Options
{
  if (options)
  {
    return options;
  }
  else 
  {
    throw new Error('unologin: library not set up.');
  }
}

/**
 * @param method http method
 * @param loc url relative to api url
 * @param body request data
 * @returns response
 */
export async function request<
  ReturnType = unknown,
  BodyType extends object = object,
>(
  method: string,
  loc: string,
  body?: BodyType,
) : Promise<ReturnType>
{
  let response : superagent.Response;

  const url = new URL(
    loc,
    getOptions().realm.apiUrl,
  ).href;

  try 
  {
    response = await getOptions().agent(method, url)
      .set(
        'Content-Type', 'application/json',
      ).set(
        'X-API-Key', getOptions().apiKey,
      ).send(body || {});
  }
  catch (e : any)
  {
    // some agents may throw on non-2XX status codes
    // this will generally include the response with the error
    if (e.response)
    {
      response = e.response;
    }
    else
    {
      throw e;
    }
  }

  const result = response.headers['content-type']
    ?.startsWith('application/json') ?
    JSON.parse(response.text) as unknown :
    response.text;

  if (
    // check for 2xx status code
    response.status >= 200 &&
    response.status < 300
  ) // successful response
  {
    return result as ReturnType;
  }
  else // error response
  {
    if (
      result &&
      typeof(result) === 'object' &&
      'code' in result && 
      'msg' in result
    )
    {
      throw new APIError(
        response.status,
        (result as any).msg,
        (result as any).data,
      );
    }
    else 
    {
      throw result;
    }
  }
}

/**
 * Verifies that a token is valid.
 * 
 * @param token login token
 * @param args optional additional body params
 * @returns {Promise<UserToken>} user token
 * 
 * @deprecated use {@link verifyTokenAndRefresh} instead
 */
export async function verifyLoginToken(
  token: string,
  args: object = {},
) : Promise<UserToken>
{
  return request<UserToken>(
    'POST',
    '/users/auth',
    {
      user: 
      {
        appLoginToken: token,
      },
      ...args,
    },
  );
}

/**
 * Verifies the login token locally and refreshes the token if required.
 * 
 * @param token token
 * @param forceRefresh forces a refresh if the token is valid
 * @returns [user, cookie | null]
 * @throws if token invalid
 */
export async function verifyTokenAndRefresh(
  token: string,
  forceRefresh: boolean = false,
) : Promise<[UserToken, LoginCookie | null]>
{
  const key = await keyManager.getLoginTokenKey();

  try
  {
    const user = jwt.verify(token, key.data) as UserToken;

    if (
      user.appId !== getOptions().appId
    )
    {
      throw new APIError(
        401,
        'token not for this appId',
        { param: 'user', user },
      );
    }

    if (
      forceRefresh || 
      (
        // cookie has a refresh-header
        user.r &&
        // cookie must be refreshed via the unologin API
        user.r + user.iat < Date.now() / 1000
      )
    )
    {
      return await request<[UserToken, LoginCookie]>(
        'POST',
        '/users/refresh',
        {
          user: 
          {
            appLoginToken: token,
          },
        },
      );
    }
    else 
    {
      return [user, null];
    }
  }
  catch (e)
  {
    if (e instanceof JsonWebTokenError)
    {
      // throw an auth error
      throw new APIError(401, e.message, { param: 'user' });
    }
    else 
    {
      throw e;
    }
  }
}

export default module.exports as typeof import('./main.js'); 
