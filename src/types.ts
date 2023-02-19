/**
 * Relevant API type declarations.
 * 
 * @module types
 * 
 */

/**
 * Parsed payload of the login token.
 *
 * @see {@link http-handlers.HttpHandlers.getUserToken}
 * 
 * @see {@link http-handlers.HttpHandlers.getUserTokenOptional}
 */
export type UserToken = 
{
  /** your appId */
  appId: string;
  /** app-specific user id */
  asuId: string;

  userClasses: string[];
  /** issued at timestamp */
  iat: number;
  /** refresh-at timestamp */
  r?: number;
}

/**
 * User handle can be used by many API calls that relate to a specific user.
 * 
 * If the user handle does not contain an ```asuId```, it is inferred by verifying the login token.
 * 
 * This avoids having to make multiple requests to obtain user information.
 * 
 * **IMPORTANT**: Generally, a user handle may be set by the requester and should
 * not be trusted until verified. 
 * 
 * Passing an unverified UserHandle to any API call will automatically attempt to verify it and
 * raise an authentication error if invalid.
 * 
 * @see {@link UserToken} for an authenticated UserHandle.
 * 
 */
export type UserHandle = 
{
  asuId: string;
} | 
{
  appLoginToken: string;
}
 

export type UserDocument<RequiredFields extends string = never> = 
{
  _id: string;

  appId: string;
  
  createdAt: string;
  
  profile: { [k in RequiredFields]: string };

  requiredFields: RequiredFields[];

  userClasses: string[];
}

/**
 * Login cookie as returned by the unologin API.
 */
export type LoginCookie =
{
  value: string;
  maxAge: number;
}

export type IUnologinClient = typeof import('./main');
