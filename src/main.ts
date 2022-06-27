
import superagent, { SuperAgentRequest } from 'superagent';

import * as expressMiddleware from './unologin-express';
import { APIError } from './errors';

import jwt, { JsonWebTokenError } from 'jsonwebtoken';
import { CookieOptions } from 'express';

export const express = expressMiddleware;

export interface Realm 
{
  apiUrl: string;
  frontendUrl?: string;
}

export interface Setup 
{
  apiKey: string;
  cookiesDomain?: string;
  realm: Realm;
  appId?: string;
  agent: (method: string, location: string) => SuperAgentRequest;
  cookieSameSite?: CookieOptions['sameSite'];
  skipPublicKeyCheck?: boolean;
}

export interface Cookie
{
  value: string;
  maxAge: number;
}

interface PublicKey
{
  data: string;
  createdAt: number;
  expiresIn: number;
}

export interface User
{
  appId: string;
  asuId: string;
  userClasses: string[];
  iat: number;
  // refresh-at timestamp
  r?: number;
}

interface ApiKeyPayload
{
  appId: string;
}

// public key for verifying login tokens
let loginTokenKey : PublicKey | null = null;

export const realms = 
{
  live: 
  {
    apiUrl: 'https://v1.unolog.in',
    frontendUrl: 'https://login.unolog.in',
  },
};

let options : Setup =
{
  realm: realms.live,
  apiKey: '',
  agent: superagent,
};

/**
 * @param key api key
 * @returns decoded key (payload)
 */
export function decodeApiKey(key : string | undefined) : ApiKeyPayload
{
  if (!key)
  {
    throw new Error('unologin api key is undefined.');
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
    throw new Error('Invalid unologin API key.');
  }

  return payload;
}

/**
 * @param opts setup
 * @returns void
 */
export function setup(opts: Partial<Setup>) : void
{
  try 
  {
    const token = decodeApiKey(opts.apiKey);
    
    options =
    {
      ...options,
      ...opts,
      appId: token.appId,
    };
  }
  catch (e)
  {
    throw new Error('malformed API key');
  }
}

/**
 * @returns setup
 */
export function getOptions() : Setup
{
  return options;
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
  let response;

  try 
  {
    response = await options.agent(
      method,
      new URL(
        loc,
        options.realm.apiUrl,
      ).href,
    ).set(
      'Content-Type', 'application/json',
    ).set(
      'X-API-Key', options.apiKey,
    ).send(body || {});
  }
  catch (e : any)
  {
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
    .startsWith('application/json') ?
    JSON.parse(response.text) :
    response.text;

  if (
    // check for 2xx status code
    response.status >= 200 &&
    response.status < 300
  ) // successful response
  {
    return result;
  }
  else // error response
  {
    throw new APIError(
      response.status,
      result.msg,
      result.data,
    );
  }
}

/**
 * 
 * @param key key
 * @returns key if valid
 * @throws error otherwise
 */
function checkLoginTokenKey(key : unknown) : PublicKey
{
  if (
    options.skipPublicKeyCheck ||
    (
      typeof(key) === 'object' &&
      typeof(key['data']) === 'string' &&
      key['data'].startsWith('-----BEGIN PUBLIC KEY-----\n')
    )
  )
  {
    return key as PublicKey;
  }
  else 
  {
    throw new Error(
      'Invalid public key returned by API: ' + JSON.stringify(key),
    );
  }
}

/**
 * @returns public key for login token verification
 */
export async function getLoginTokenKey() : Promise<PublicKey>
{
  if (
    loginTokenKey?.data && 
    (
      // key has no expiration
      !loginTokenKey.expiresIn ||
      // or key has not expired yet
      (loginTokenKey.createdAt + loginTokenKey.expiresIn > Date.now())
    )
  )
  {
    return loginTokenKey;
  }
  else
  {
    return (loginTokenKey = checkLoginTokenKey(
      await request(
        'GET',
        '/public-keys/app-login-token',
      ),
    ));
  }
}

/**
 * Verifies that a token is valid.
 * 
 * @param token login token
 * @param args optional additional body params
 * @returns user
 * 
 * @deprecated use verifyTokenAndRefresh instead
 */
export async function verifyLoginToken(
  token: string,
  args: object = {},
) 
: Promise<User>
{
  return request<User>(
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
 * Verifies the login token locally and refreshes the token with the remote API if required.
 * 
 * @param token token
 * @param forceRefresh forces a refresh if the token is valid
 * @returns [user, cookie | null]
 * @throws if token invalid
 */
export async function verifyTokenAndRefresh(
  token: string,
  forceRefresh: boolean = false,
) : Promise<[User, Cookie | null]>
{
  const key = await getLoginTokenKey();

  try
  {
    const user = jwt.verify(token, key.data) as User;

    if (
      user.appId !== options.appId
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
      return await request<[User, Cookie]>(
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
