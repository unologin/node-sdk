
import superagent, { SuperAgentRequest } from 'superagent';

import path from 'path';

import * as expressMiddleware from './unologin-express';
import { APIError } from './errors';

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
  agent: (method: string, location: string) => SuperAgentRequest,
}

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
  options = { ...options, ...opts };
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

export interface User
{
  asuId: string;
}

/**
 * Verifies that a token is valid.
 * 
 * @param token login token
 * @param args optional additional body params
 * @returns {TokenValidationResult} with either a user or a msg
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
