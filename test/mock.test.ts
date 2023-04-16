
/**
 * Tests for the mock api implementation
 */

import mockApi, {
  createToken,
} from './mock';

import {
  mock,
  supermock,
} from 'express-supermock';

import * as unologin from '../src/main';

import {
  APIError,
} from '../src/errors';

import {
  createApiToken,
} from '../src/test-utils';

mock('v1.unolog.in', { router: mockApi });

const appId = '6f521a08a74b3154aa112f9b';

const token = createApiToken(appId);

unologin.setup(
  { 
    apiKey: token,
    cookiesDomain: '.example.com',
    agent: supermock,
  },
);

jest.spyOn(
  unologin.keyManager,
  'checkLoginTokenKey',
).mockImplementation(
  (key) => key as any,
);

describe('verifyLoginToken', () => 
{
  it('returns an error for missing tokens', async () =>   
  { 
    // TODO: check isAuthError
    await expect(unologin.verifyLoginToken(undefined as unknown as string))
      .rejects.toBeInstanceOf(APIError);
  });

  it('returns an error for invalid tokens', async () =>   
  {
    // TODO: check isAuthError
    await expect(unologin.verifyLoginToken('invalid'))
      .rejects.toBeInstanceOf(APIError);
  });

  it('returns user info for valid tokens', async () =>   
  {
    const user = 
    {
      appId,
      id: '5ebac35e9bdf9a2ebbb8e92f',
      userClasses: ['users_default'],
    };

    const res = await unologin.verifyLoginToken(createToken(user));
    
    for (const [key, value] of Object.entries(user))
    {
      expect((res as any)[key], key).toStrictEqual(value);
    }
  });
});

