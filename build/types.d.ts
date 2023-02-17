/**
 * Relevant API type declarations.
 *
 * @module types
 *
 */
export type UserToken = {
    /** your appId */
    appId: string;
    /** app-specific user id */
    asuId: string;
    userClasses: string[];
    /** issued at timestamp */
    iat: number;
    /** refresh-at timestamp */
    r?: number;
};
export type UserDocument<RequiredFields extends string = never> = {
    _id: string;
    appId: string;
    createdAt: string;
    profile: {
        [k in RequiredFields]: string;
    };
    requiredFields: RequiredFields[];
    userClasses: string[];
};
/**
 * Login cookie as returned by the unologin API.
 */
export type LoginCookie = {
    value: string;
    maxAge: number;
};
export type IUnologinClient = typeof import('./main');
