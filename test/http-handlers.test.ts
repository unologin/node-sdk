
// express is only used to wrap the handlers
// so that they can be tested using supertest
// express handlers are tested in express-handlers.test.ts
import express from 'express';

import cookieParser from 'cookie-parser';

import parseSetCookieHeader from 'set-cookie-parser';

import supertest from 'supertest';

import {
  createMocks,
} from 'node-mocks-http';

import HttpHandlers from '../src/http-handlers';

// importing ExpressHandlers for its setCookie function
import ExpressHandlers from '../src/express-handlers';

import unologin from '../src/main';

import {
  createApiToken,
} from '../src/test-utils';

import {
  LoginCookie,
  UserToken,
} from '../src/types';
import { APIError } from '../src/errors';


unologin.setup(
  {
    appId: 'my-appId',
    apiKey: createApiToken('my-appId'),
    // no need to mock the agent as API communication is tested elsewhere
    agent: () => 
    {
      throw new Error('Should not make API requests while testing.');
    },
  },
);

/** */
class BasicHandlers
  extends HttpHandlers
{
  setCookie = ExpressHandlers.prototype.setCookie.bind(this);
}

const httpHandlers = new BasicHandlers(unologin);

const verifyTokenAndRefresh = jest.spyOn(
  unologin,
  'verifyTokenAndRefresh',
);

const mockToken = (props : Partial<UserToken> = {}) : UserToken => (
  {
    iat: Date.now(),
    asuId: 'my-asuId',
    appId: 'my-appId',
    userClasses: [],
    r: Date.now() + 1000 * 60 * 60,
    ...props,
  }
); 

describe('getUserTokenOptional', () => 
{
  const app = express();

  app.use(cookieParser());

  app.use(
    async (req, res, next) => 
    {
      try 
      {
        const token = await httpHandlers
          .getUserTokenOptional(req, res);

        res.send({ token });
      }
      catch (e)
      {
        next(e);
      }
    },
  );

  app.use(
    // @ts-ignore
    (error, req, res, next) => 
    {
      if (!(error instanceof APIError))
      {
        console.error(req.url, error);
      }

      res.status(error.code || 500).send({ error });

      next();
    },
  );

  const request = supertest(app);

  const { get } = request;

  it('returns null when omitting token', async () =>
  {
    expect(JSON.parse((await get('/')).text))
      .toStrictEqual({ token: null });

    expect(verifyTokenAndRefresh)
      .toHaveBeenCalledTimes(0);
  });


  it('throws unauthorized if login cookie invalid', async () => 
  {
    const error = new APIError(401, 'unauthorized', { param: 'user' });

    verifyTokenAndRefresh.mockRejectedValueOnce(error);

    await get('/')
      .set('Cookie', `_uno_appLoginToken=myInvalidToken`)
      .expect(error.code)
      .send();
    
    expect(verifyTokenAndRefresh)
      .toHaveBeenCalledTimes(1);

    expect(verifyTokenAndRefresh)
      .toHaveBeenCalledWith('myInvalidToken');
  });

  it('returns UserToken if login cookie valid', async () => 
  {
    const token = 'sup3rs3cure';

    const expectedToken = mockToken();

    verifyTokenAndRefresh.mockResolvedValueOnce(
      [expectedToken, null],
    );

    const resp = await get('')
      .set('Cookie', `_uno_appLoginToken=${token}`);

    expect(JSON.parse(resp.text))
      .toStrictEqual({ token: expectedToken });
  
    expect(verifyTokenAndRefresh)
      .toHaveBeenCalledTimes(1);

    expect(verifyTokenAndRefresh)
      .toHaveBeenCalledWith(token);
  }); 

  it('refreshes cookie if new cookie returned by unologin API', async () => 
  {
    const token = 'needsRefresh';

    const expectedToken = mockToken();

    const expectedCookie : LoginCookie = 
    {
      value: 'newtoken',
      maxAge: 60 * 1000,
    };

    verifyTokenAndRefresh.mockResolvedValueOnce(
      [expectedToken, expectedCookie],
    );

    const setCookie = jest.spyOn(httpHandlers, 'setCookie');

    const resp = await get('')
      .set('Cookie', `_uno_appLoginToken=${token}`);

    expect(JSON.parse(resp.text))
      .toStrictEqual({ token: expectedToken });
  
    expect(verifyTokenAndRefresh)
      .toHaveBeenCalledTimes(1);

    expect(verifyTokenAndRefresh)
      .toHaveBeenCalledWith(token);

    const expectedNumCookies = 2;

    expect(setCookie)
      .toHaveBeenCalledTimes(expectedNumCookies);

    const cookieHeader = resp.headers['set-cookie'];

    expect(cookieHeader)
      .toBeTruthy();

    const cookies = parseSetCookieHeader(cookieHeader);

    expect(cookies.length)
      .toBe(expectedNumCookies);

    const loginCookie = cookies.find(
      ({ name }) => name === '_uno_appLoginToken',
    );

    const stateCookie = cookies.find(
      ({ name }) => name === '_uno_loginState',
    );

    expect(stateCookie?.value)
      .toBe('success');

    expect(loginCookie?.value)
      .toBe(expectedCookie.value);

    expect(stateCookie?.expires?.toString())
      .toBe(loginCookie?.expires?.toString());

    expect(loginCookie?.maxAge)
      .toBe(60);
  });
});

describe('handleLoginEvent', () => 
{
  it('forwards any non-auth-errors from verifyTokenAndRefresh', async () =>
  {
    const errors = 
    [
      new Error('Internal error'),
      // isAuthError() == false 
      new APIError(401, 'invalid api key', {}),
    ];

    for (const error of errors)
    {
      verifyTokenAndRefresh.mockRejectedValueOnce(error);

      const { req, res } = createMocks();

      req.query.origin = unologin.getOptions().realm.frontendUrl;

      await expect(
        httpHandlers.handleLoginEvent(req, res),
      ).rejects.toBe(error);
    }
  });

  it('Rejects if the origin does not match the realm.', async () => 
  {
    const origins = 
    [
      undefined,
      null,
      false,
      'https://not.unolog.in',
    ];

    const getLoginUrlFromLoginEvent = jest.spyOn(
      httpHandlers,
      'getLoginUrlFromLoginEvent',
    );

    for (const origin of origins)
    {
      const { req, res } = createMocks();

      req.query.origin = origin as any;

      await expect(
        httpHandlers.handleLoginEvent(req, res),
        // TODO: check that the correct error is thrown
      ).rejects.toBeTruthy();

      expect(getLoginUrlFromLoginEvent)
        .toHaveBeenLastCalledWith(req, res);
    }
  });

  it('Accepts any origins from the correct realm.', async () => 
  {
    const base = unologin.getOptions().realm.frontendUrl;

    const origins = 
    [
      base,
      new URL('/login/abc', base).href,
      new URL('/?key=value', base).href,
    ];

    for (const origin of origins)
    {
      const { req, res } = createMocks();

      req.query.origin = origin as any;

      const url = httpHandlers.getLoginUrlFromLoginEvent(req, res);

      expect(url.href)
        .toBe(new URL(origin).href);
    }
  });

  it.todo('move tests from express-handlers.test.ts in here');
});
