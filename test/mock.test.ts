
/**
 * Tests for the mock api implementation
 */

import mockApi, { createToken } from './mock';

import { mock, supermock } from 'express-supermock';

import * as unologin from '../src/main';
import { APIError } from '../src/errors';

mock('v1.unolog.in', { router: mockApi });

const appId = '6f521a08a74b3154aa112f9b';

const token = Buffer.from(
  JSON.stringify(
    {payload: {data: {appId }}},
  ),
).toString('base64');

unologin.setup({ apiKey: token, agent: supermock, skipPublicKeyCheck: true });

describe('verifyLoginToken', () => 
{
  it('returns an error for missing tokens', async () =>   
  {
    // TODO: check isAuthError
    await expect(unologin.verifyLoginToken(undefined))
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
      asuId: '5ebac35e9bdf9a2ebbb8e92f',
      userClasses: ['users_default'],
    };

    const res = await unologin.verifyLoginToken(createToken(user));
    
    for (const [key, value] of Object.entries(user))
    {
      expect(res[key], key).toStrictEqual(value);
    }
  });
});

