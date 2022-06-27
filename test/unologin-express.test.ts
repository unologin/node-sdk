
/**
 * Tests for the express implementation
 */

import express from 'express';
import { mock, supermock } from 'express-supermock';

import supertest from 'supertest';

import setCookieParser from 'set-cookie-parser';

import { createApiToken } from '../src/test-utils';

import mockApi, { createToken } from './mock';

import cookieParser from 'cookie-parser';

import * as unologin from '../src/main';

import { 
  onAuthError,
  parseLogin,
  requireLogin,
  loginEventHandler, 
  logoutHandler,
} from '../src/unologin-express';

mock('mock-api.unolog.in', { router: mockApi });

const app = express();

const cookiesDomain = '.example.com';

const appId = '6f521a08a74b3154aa112f9b';

const token = createApiToken(appId);

// setup unologin
unologin.setup(
  {
    apiKey: token,
    cookiesDomain,
    realm: 
    {
      apiUrl: 'https://mock-api.unolog.in',
      frontendUrl: 'https://mock-frontend.unolog.in',
    },
    agent: supermock,
    skipPublicKeyCheck: true,
  },
);

app.use(express.json());
app.use(cookieParser());

app.post('/unologin/login', loginEventHandler);

app.all('*', parseLogin);

app.all('/me/*', requireLogin);

app.post('/logout', logoutHandler);

app.all('*', (req, res) => 
{
  res.send({ user: res.locals.unologin?.user });
});

describe('loginEventHandler', () => 
{
  const user =
  {
    appId,
    asuId: '5ebac35e9bdf9a2ebbb8e92f',
    userClasses: ['users_default'],
  };

  let cookies = [];

  it('redirects to the unologin front end with success=true', async () => 
  {
    const token = createToken(user);

    const origin = 'https://mock-frontend.unolog.in';

    const { text, headers } = await supertest(app)
      .post(
        `/unologin/login?token=${token}&origin=${encodeURIComponent(origin)}`,
      )
      .set('Origin', origin)
      // expect a redirect
      .expect(302);

    const url = new URL(text.replace('Found. Redirecting to ', ''));

    expect(url.hostname).toBe('mock-frontend.unolog.in');
    expect(url.searchParams.get('loginHandlerSuccess')).toBe('true');

    const loginCookie = setCookieParser.parseString(headers['set-cookie'][0]);
    const statusCookie = setCookieParser.parseString(headers['set-cookie'][1]);

    expect(loginCookie.name).toBe('_uno_appLoginToken');
    expect(loginCookie.httpOnly).toBe(true);
    expect(loginCookie.secure).toBe(true);
    expect(loginCookie.value).toBe(token);
    expect(loginCookie.domain).toBe(cookiesDomain);

    expect(statusCookie.name).toBe('_uno_loginState');
    expect(!statusCookie.httpOnly).toBeTruthy();
    expect(statusCookie.secure).toBe(true);
    expect(statusCookie.value).toBe('success');
    expect(statusCookie.domain).toBe(cookiesDomain);

    cookies = headers['set-cookie'];
  });

  it('set-cookie results in valid login credentials', async () => 
  {
    const { text } = await supertest(app).post('/me/test')
      .set('Cookie', cookies)
      .send()
      .expect(200);

    const res = JSON.parse(text).user;

    for (const [key, value] of Object.entries(user))
    {
      expect(res[key], key).toStrictEqual(value);
    }
  });

  it('redirects to the unologin front end with success=false', async () => 
  {
    const token = 'invalid';

    const origin = 'https://mock-frontend.unolog.in';

    const { text, headers } = await supertest(app)
      .post(
        `/unologin/login?token=${token}&origin=${encodeURIComponent(origin)}`
      )
      // expect a redirect
      .expect(302);

    const url = new URL(text.replace('Found. Redirecting to ', ''));

    expect(url.hostname).toBe('mock-frontend.unolog.in');
    expect(url.searchParams.get('loginHandlerSuccess')).toBe('false');
    expect(url.searchParams.get('loginHandlerMsg')).toBe('jwt malformed');

    expect(headers['set-cookie']).toBe(undefined);
  });

});

describe('parseLogin', () => 
{

  it('does nothing when not providing any login cookie', async () => 
  {
    const res = await supertest(app).post('/public')
      .send()
      .expect(200);

    const { user } = JSON.parse(res.text);

    expect(user).toBe(undefined);

  });

  it('error code when using an invalid cookie where not required', async () => 
  {
    await supertest(app).post('/public')
      .set('Cookie', ['_uno_appLoginToken=invalid'])
      .send()
      .expect(401);
  });

  it('parses the login info if valid', async () => 
  {
    const res = await supertest(app).post('/public')
      .set('Cookie', [''])
      .send()
      .expect(200);

    const { user } = JSON.parse(res.text);

    expect(user).toBe(undefined);

  });

});

describe('requireLogin', () => 
{
  it('error code when missing cookie where required', async () => 
  {
    await supertest(app).post('/me/test')
      .send()
      .expect(401);

  });

  it('error code when using an invalid cookie where required', async () => 
  {
    await supertest(app).post('/me/test')
      .set('Cookie', ['_uno_appLoginToken=invalid'])
      .send()
      .expect(401);
  });

});

describe('logoutHandler', () => 
{
  it('expires all cookies when called as a function', async () => 
  {
    const { headers } = await supertest(app).post('/me/test')
      .set('Cookie', ['_uno_appLoginToken=invalid'])
      .send()
      .expect(401);

    const loginCookie = setCookieParser.parseString(headers['set-cookie'][0]);
    const statusCookie = setCookieParser.parseString(headers['set-cookie'][1]);

    expect(
      statusCookie.expires <= new Date(),
      'status cookie has not expired ' + headers['set-cookie'][1],
    ).toBeTruthy();

    expect(
      loginCookie.expires <= new Date(),
      'login cookie has not expired ' + headers['set-cookie'][1],
    ).toBeTruthy();
  });

  it('expires all cookies when used as middleware', async () => 
  {
    const { headers } = await supertest(app).post('/logout')
      .send()
      .expect(200);

    const loginCookie = setCookieParser.parseString(headers['set-cookie'][0]);
    const statusCookie = setCookieParser.parseString(headers['set-cookie'][1]);

    expect(
      statusCookie.expires <= new Date(),
      'status cookie has not expired ' + headers['set-cookie'][1],
    ).toBe(true);

    expect(
      loginCookie.expires <= new Date(),
      'login cookie has not expired ' + headers['set-cookie'][1],
    ).toBe(true);

  });
});

describe('custom error handlers', () => 
{
  it('executes the custom handler', async () => 
  {
    // register a custom handler
    onAuthError((req, res) =>
    {
      res.status(666);
      res.send('custom error');
    });

    await supertest(app).post('/me/test')
      .set('Cookie', ['_uno_appLoginToken=invalid'])
      .send()
      .expect(666);
  });

});

