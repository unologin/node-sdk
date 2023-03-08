
import KeyManager, {
  PublicKey,
} from '../src/key-manager';

describe('checkLoginTokenKey', () => 
{
  it.todo('Ensures PublicKey structure.');
});

describe('getLoginTokenKey', () => 
{
  const request = jest.fn();

  const keys = new KeyManager({ request });

  const checkLoginTokenKey = jest.spyOn(
    keys,
    'checkLoginTokenKey',
  ).mockImplementation(
    (key) => key as PublicKey,
  );

  const mockKey : PublicKey = 
  {
    data: 'mock data',
    createdAt: Date.now(),
    expiresIn: 2000,
  };

  request.mockResolvedValue(mockKey);

  it('Fetches key from API and stores it in cache.', async () => 
  {
    const key = await keys.getLoginTokenKey();

    expect(request)
      .toHaveBeenCalledWith(
        'GET',
        '/public-keys/app-login-token',
      );

    expect(request)
      .toHaveBeenCalledTimes(1);

    expect(checkLoginTokenKey)
      .toHaveBeenCalledWith(mockKey);

    expect(key)
      .toStrictEqual(mockKey);

    expect(keys['loginTokenKey'])
      .toStrictEqual(mockKey);
  });

  it('Returns key from cache if not expired.', async () => 
  {
    const key2 = await keys.getLoginTokenKey();

    expect(request)
      .toHaveBeenCalledTimes(0);

    expect(checkLoginTokenKey)
      .toHaveBeenCalledTimes(0);

    expect(key2).toStrictEqual(mockKey);
  });

  it(
    'Fetches key from API and stores it in cache if cached key expired.', 
    async () => 
    {
      const newKey : PublicKey = 
      {
        data: 'new data',
        createdAt: Date.now(),
        expiresIn: 2000,
      };

      request.mockResolvedValueOnce(newKey);

      const now = jest.spyOn(Date, 'now')
        .mockReturnValue(mockKey.createdAt + mockKey.expiresIn + 1);

      const key = await keys.getLoginTokenKey();
      
      expect(request)
        .toHaveBeenCalledWith(
          'GET',
          '/public-keys/app-login-token',
        );

      expect(request)
        .toHaveBeenCalledTimes(1);

      expect(now)
        .toHaveBeenCalledTimes(1);

      expect(key)
        .toStrictEqual(newKey);
    },
  );
});
