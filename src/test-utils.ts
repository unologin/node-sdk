
import jwt from 'jsonwebtoken';

/**
 * @param appId appId
 * @returns fake API-token that can be used for local testing
 */
export function createApiToken(appId: string)
{
  return jwt.sign({ appId }, 'guest');
}
