
/**
 * Tests for the mock api implementation
 */

import mockApi, { createToken } from './mock';

import { mock, supermock } from 'express-supermock';

import chai, { expect, assert } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import * as unologin from '../src/main';

chai.use(chaiAsPromised);

mock('api.unolog.in', { router: mockApi });

const appId = '6f521a08a74b3154aa112f9b';

const token = Buffer.from(
  JSON.stringify(
    {payload: {data: {appId }}},
  ),
).toString('base64');

unologin.setup({ apiKey: token, agent: supermock });

describe('verifyLoginToken', () => 
{
  it('returns an error for missing tokens', async () =>   
  {
    await expect(unologin.verifyLoginToken(undefined))
      .to.eventually.rejected.then(
        (e) => assert(e.isAuthError?.()),
      );
  });

  it('returns an error for invalid tokens', async () =>   
  {
    await expect(unologin.verifyLoginToken('invalid'))
      .to.eventually.rejected.then(
        (e) => assert(e.isAuthError?.()),
      );
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
      expect(res[key], key).to.be.deep.eq(value);
    }
  });
});

describe('setup', () =>
{
});
