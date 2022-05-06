
import { decodeApiKey } from '../src/main';

// eslint-disable-next-line max-len
const keyLegacy = 'eyAicGF5bG9hZCI6IHsgImRhdGEiOiB7ICJhcHBJZCI6ICJsZWdhY3lBcHBJZCIgfSB9IH0=';

// eslint-disable-next-line max-len
const keyJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHBJZCI6Imp3dEFwcElkIiwidCI6ImFwaSIsImlhdCI6MTY1MTgyNDgwM30.fCAqM4aQtUhHX59j8o_rF0fbVXRIzMsEoiT1Z623w8g';

describe('decodeApiKey', () =>
{
  it('decodes legacy API keys', () => 
  {
    expect(
      decodeApiKey(keyLegacy).appId,
    ).toBe('legacyAppId');
  });

  it('decodes jwt API keys', () => 
  {
    expect(
      decodeApiKey(keyJwt).appId,
    ).toBe('jwtAppId');
  });
});
