
import unologin from '../src/main';

import * as unologinStar from '../src/main';

test('', () => 
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
});
