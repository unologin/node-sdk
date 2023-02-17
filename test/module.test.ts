/**
 * tests general main behavior and that all exports work as expected
 */

import unologin from '../src/main';

import * as unologinStar from '../src/main';
import { UnologinRestApi } from '../src/rest';


test('default import and * import', () => 
{
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const testDefault = (_ : typeof unologin) => null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const testStar = (_ : typeof unologinStar) => null;

  // tests that at least one of the functions exist according to ts
  // if something goes wrong (especially with the default export, all members will be missing)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const testMembers = (_ : { verifyLoginToken: unknown }) => null;
  
  testDefault(unologinStar);

  testStar(unologin);

  testMembers(unologin);
  testMembers(unologinStar);

  expect(unologin)
    .toStrictEqual(unologinStar);

  expect(unologin)
    .toBe(unologinStar.default);
});

test('exported REST API', async () => 
{
  const restApi = unologin.rest;

  expect(restApi)
    .toBeInstanceOf(UnologinRestApi);

  // making a simple request to the api to make sure that the correct
  // `request` implementation is called

  const request = jest.spyOn(
    unologin,
    'request',
  ).mockResolvedValue(
    { foo: 'bar' },
  );

  jest.spyOn(
    unologin,
    'getOptions',
  ).mockReturnValue(
    unologin.defaultOptions as any,
  );

  const user = await restApi.getUserDocument(
    { asuId: 'abc123' },
  );

  expect(user)
    .toStrictEqual({ foo: 'bar' });

  expect(request)
    .toHaveBeenCalledTimes(1);
});

describe('setup', () => 
{
  it('Throws on invalid API key', ()=> 
  {
    expect(
      () => unologin.setup({ apiKey: 'invalid' }),
    ).toThrow('Malformed API key.');
  });
});
