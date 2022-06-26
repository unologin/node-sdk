import { SuperAgentRequest } from 'superagent';
import * as expressMiddleware from './unologin-express';
import { CookieOptions } from 'express';
export declare const express: typeof expressMiddleware;
export interface Realm {
    apiUrl: string;
    frontendUrl?: string;
}
export interface Setup {
    apiKey: string;
    cookiesDomain?: string;
    realm: Realm;
    appId?: string;
    agent: (method: string, location: string) => SuperAgentRequest;
    cookieSameSite?: CookieOptions['sameSite'];
    skipPublicKeyCheck?: boolean;
}
export interface Cookie {
    value: string;
    maxAge: number;
}
interface PublicKey {
    data: string;
    createdAt: number;
    expiresIn: number;
}
export interface User {
    appId: string;
    asuId: string;
    userClasses: string[];
    iat: number;
    r?: number;
}
interface ApiKeyPayload {
    appId: string;
}
export declare const realms: {
    live: {
        apiUrl: string;
        frontendUrl: string;
    };
};
/**
 * @param key api key
 * @returns decoded key (payload)
 */
export declare function decodeApiKey(key: string | undefined): ApiKeyPayload;
/**
 * @param opts setup
 * @returns void
 */
export declare function setup(opts: Partial<Setup>): void;
/**
 * @returns setup
 */
export declare function getOptions(): Setup;
/**
 * @param method http method
 * @param loc url relative to api url
 * @param body request data
 * @returns response
 */
export declare function request<ReturnType = unknown, BodyType extends object = object>(method: string, loc: string, body?: BodyType): Promise<ReturnType>;
/**
 * @returns public key for login token verification
 */
export declare function getLoginTokenKey(): Promise<PublicKey>;
/**
 * Verifies that a token is valid.
 *
 * @param token login token
 * @param args optional additional body params
 * @returns user
 *
 * @deprecated use verifyTokenAndRefresh instead
 */
export declare function verifyLoginToken(token: string, args?: object): Promise<User>;
/**
 * Verifies the login token locally and refreshes the token with the remote API if required.
 *
 * @param token token
 * @param forceRefresh forces a refresh if the token is valid
 * @returns [user, cookie | null]
 * @throws if token invalid
 */
export declare function verifyTokenAndRefresh(token: string, forceRefresh?: boolean): Promise<[User, Cookie | null]>;
export {};
