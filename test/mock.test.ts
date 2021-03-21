
/**
 * Tests for the mock api implementation
 */

import mockApi, { createToken } from './mock';

import { mock, supermock } from 'express-supermock';

import proxyquire from 'proxyquire';
import { assert } from 'chai';

mock('api.unolog.in', { router: mockApi });

const unologin = proxyquire('../src/api', { superagent: supermock });

unologin.setup({ apiKey: 'abc123' });

describe('verifyLoginToken', () => 
{
  it('returns an error for missing tokens', async () =>   
  {
    const { user, msg } = await unologin.verifyLoginToken(undefined);

    assert.strictEqual(user, undefined);

    assert.strictEqual(msg, 'invalid token');
  });

  it('returns an error for invalid tokens', async () =>   
  {
    const { user, msg } = await unologin.verifyLoginToken('invalid');

    assert.strictEqual(user, undefined);

    assert.strictEqual(msg, 'invalid token');
  });

  it('returns user info for valid tokens', async () =>   
  {
    const mockUser = 
    {
      asuId: '5ebac35e9bdf9a2ebbb8e92f',
      userClasses: ['users_default'],
    };

    const { user, msg } = await unologin.verifyLoginToken(
      createToken(mockUser),
    );

    assert.strictEqual(msg, undefined);

    assert.deepStrictEqual(user, mockUser);
  });
});

describe('setup', () =>
{
});
