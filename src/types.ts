/**
 * Relevant API type declarations.
 * 
 * @module types
 * 
 */


export type UserToken = 
{
  appId: string;
  // app-specific user id
  asuId: string;
  userClasses: string[];
  // issued at timestamp
  iat: number;
  // refresh-at timestamp
  r?: number;
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

export type IUnologinClient = typeof import('./main');
