
/**
 * Tests for the mock api implementation
 */

import mockApi, { createToken } from './mock';

import { mock, supermock } from 'express-supermock';

import proxyquire from 'proxyquire';
import chai, { expect, assert } from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

mock('api.unolog.in', { router: mockApi });

const unologin = proxyquire('../src/main', { superagent: supermock });

unologin.setup({ apiKey: 'abc123' });

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
      asuId: '5ebac35e9bdf9a2ebbb8e92f',
      userClasses: ['users_default'],
    };

    await expect(unologin.verifyLoginToken(createToken(user)))
      .to.eventually.deep.equal(user);
  });
});

describe('setup', () =>
{
});
