
import superagent from 'superagent';

import path from 'path';

export interface Realm 
{
  apiUrl: string;
  frontendUrl: string;
}

export interface Setup 
{
  apiKey?: string;
  cookiesDomain?: string;
  realm: Realm;
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
export async function request(
  method: string,
  loc: string,
  body: object = {},
) : Promise<unknown>
{
  const response : superagent.Response = await superagent(
    method,
    new URL(
      path.join('/api/apps/', loc),
      options.realm.apiUrl,
    ).href,
  ).set(
    'Content-Type', 'application/json',
  ).set(
    'X-API-Key', options.apiKey,
  ).send(body);

  const { result, error } = JSON.parse(response.text);

  if (error.code === 200)
  {
    return result;
  }
  else
  {
    throw error;
  }
}

export interface User
{
  asuId: string;
}

export interface TokenValidationResult
{
  user?: User;
  msg?: string;
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
: Promise<TokenValidationResult>
{
  try 
  {
    const user = await request(
      'POST',
      '/users/auth',
      {
        user: 
        {
          appLoginToken: token,
        },
        ...args,
      },
    ) as { asuId: string, userClasses: string[] };

    return { user };
  }
  catch (e)
  {
    if (e.data?.param === 'user')
    {
      return { msg: e.msg };
    }
    else
    {
      throw e;
    }
  }
}
