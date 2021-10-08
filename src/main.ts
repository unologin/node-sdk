
import superagent, { SuperAgentRequest } from 'superagent';

import path from 'path';

import * as expressMiddleware from './unologin-express';
import { APIError } from './errors';

import jwt, { JsonWebTokenError } from 'jsonwebtoken';

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
  agent: (method: string, location: string) => SuperAgentRequest,
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

// public key for verifying login tokens
let loginTokenKey : PublicKey | null = null;

export const realms = 
{
  live: 
  {
    apiUrl: 'https://api.unolog.in',
    frontendUrl: 'https://unolog.in',
  },
  dev: 
  {
    apiUrl: 'https://api-dev.unolog.in',
    frontendUrl: 'https://dev.unolog.in',
  },
};

let options : Setup =
{
  realm: realms.live,
  apiKey: '',
  agent: superagent,
};

/**
 * @param opts setup
 * @returns void
 */
export function setup(opts: Partial<Setup>) : void
{
  try 
  {
    const token = JSON.parse(
      Buffer.from(opts.apiKey, 'base64').toString(),
    );
    
    options =
    {
      ...options,
      ...opts,
      appId: token.payload.data.appId,
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
export async function request<ReturnType = unknown>(
  method: string,
  loc: string,
  body: object = {},
) : Promise<ReturnType>
{
  const response = await options.agent(
    method,
    new URL(
      path.join(loc),
      options.realm.apiUrl,
    ).href,
  ).set(
    'Content-Type', 'application/json',
  ).set(
    'X-API-Key', options.apiKey,
  ).send(body);
  
  let result;

  try
  {
    result = JSON.parse(response.text);
  }
  catch (e)
  {
    // should only happen if the apiUrl is not configured properly
    throw new Error('Cannot parse API response: ' + response.text);
  }

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
    return (loginTokenKey = await request(
      'GET',
      '/public-keys/app-login-token',
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
  const user = await request<User>(
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

  return user;
}

/**
 * Verifies the login token locally and refreshes the token with the remote API if required.
 * 
 * @param token token
 * @param forceRefresh forces a refresh if the token is valid
 * @returns [user, token]
 */
export async function verifyTokenAndRefresh(
  token: string,
  forceRefresh: boolean = false,
) : Promise<[User, Cookie]>
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
        // user has a refresh-header
        user.r &&
        // user must be refreshed with the unologin API
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
      return [user, undefined];
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
