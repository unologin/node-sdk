/**
 * @module key-manager
 * @hidden
 */

import { IUnologinClient } from './types';


export interface PublicKey
{
  data: string;
  createdAt: number;
  expiresIn: number;
}

/**
 * Ensures that the key passed has the correct structure.
 * @param key key
 * @returns key if valid
 * @throws Error otherwise
 */
export function checkLoginTokenKey(key : unknown) : PublicKey
{
  if (
    typeof(key) === 'object' &&
    typeof((key as any)['data']) === 'string' &&
    (key as any)['data'].startsWith('-----BEGIN PUBLIC KEY-----\n')
  )
  {
    return key as PublicKey;
  }
  else 
  {
    throw new Error(
      'Invalid public key returned by API: ' + JSON.stringify(key),
    );
  }
}

/**
 * Handles fetching and caching of public keys.
 */
export default class KeyManager
{
  // cached public key for verifying login tokens
  private loginTokenKey : PublicKey | null = null;


  /** */
  constructor(
    private client : Pick<IUnologinClient, 'request'>,
  ) {}

  /**
   * Alias for {@link checkLoginTokenKey}.
   * @param key key
   * @returns PublicKey
   */
  public checkLoginTokenKey(key : unknown) : PublicKey
  {
    return checkLoginTokenKey(key);
  }
 
  /**
   * @returns {Promise<PublicKey>} key for login token verification
   */
  async getLoginTokenKey() : Promise<PublicKey>
  {
    const key = this.loginTokenKey;
    
    if (
      key?.data && 
      (
        // key has no expiration
        !key.expiresIn ||
        // or key has not expired yet
        (key.createdAt + key.expiresIn > Date.now())
      )
    )
    {
      return key;
    }
    else
    {
      const newKey = await this.client.request(
        'GET',
        '/public-keys/app-login-token',
      ).then(
        (key) => this.checkLoginTokenKey(key),
      );

      this.loginTokenKey = newKey;

      return newKey;
    }
  }

}
