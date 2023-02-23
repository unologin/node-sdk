/**
 * Entry point for the @unologin/node-sdk package.
 *
 * @module main
 *
 */
import superagent, { SuperAgentRequest } from 'superagent';
import ExpressHandlers from './express-handlers';
import type { CookieOptions } from 'express';
import type { UserToken, LoginCookie } from './types';
import { UnologinRestApi } from './rest';
import KeyManager from './key-manager';
/** @hidden @internal */
export declare const keyManager: KeyManager;
/**
 * REST API instance.
 * @see {@link rest.UnologinRestApi}
 */
export declare const rest: UnologinRestApi;
/** @module express */
export declare const express: ExpressHandlers;
/** @deprecated alias for {@link types.UserToken} */
export type User = UserToken;
/** Defines unolog·in API and frontend URls */
export interface Realm {
    apiUrl: string;
    frontendUrl: string;
}
/**
 * Configuration for the API.
 */
export interface Options {
    /**
    * API key from [the dashboard](https://dashboard.unolog.in).
    */
    apiKey: string;
    /**
     * Dictates the [Domain](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#domaindomain-value) attribute for authentication cookies.
     *
     * Example: ```'.example.com'```
     */
    cookiesDomain?: string;
    /**
     * Override the [SameSite](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#samesitesamesite-value) attribute for authentication cookies.
     */
    cookieSameSite?: CookieOptions['sameSite'];
    /**
     * Configures the URL of the unolog·in API.
     */
    realm: Realm;
    /**
     * Your appId. Automatically inferred from {@link apiKey}.
     */
    appId: string;
    /**
     * Superagent-like agent.
     * Pass your own instance of superagent or supertest.
     *
     * @param method method
     * @param location url
     * @returns SuperAgentRequest
     */
    agent: (method: string, location: string) => SuperAgentRequest;
    /**
     * Disable secure cookies.
     * Will only take effect if ```process.env.NODE_ENV === 'development'```.
     */
    disableSecureCookies?: boolean;
}
export interface ApiKeyPayload {
    appId: string;
}
export declare const realms: {
    live: {
        apiUrl: string;
        frontendUrl: string;
    };
};
export declare const defaultOptions: {
    realm: {
        apiUrl: string;
        frontendUrl: string;
    };
    agent: superagent.SuperAgentStatic;
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
export declare function setup(opts: Omit<Options, keyof typeof defaultOptions | 'appId'> & Partial<Options>): void;
/**
 * @returns setup
 */
export declare function getOptions(): Options;
/**
 * @param method http method
 * @param loc url relative to api url
 * @param body request data
 * @returns response
 */
export declare function request<ReturnType = unknown, BodyType extends object = object>(method: string, loc: string, body?: BodyType): Promise<ReturnType>;
/**
 * Verifies that a token is valid.
 *
 * @param token login token
 * @param args optional additional body params
 * @returns {Promise<UserToken>} user token
 *
 * @deprecated use {@link verifyTokenAndRefresh} instead
 */
export declare function verifyLoginToken(token: string, args?: object): Promise<UserToken>;
/**
 * Verifies the login token locally and refreshes the token if required.
 *
 * @param token token
 * @param forceRefresh forces a refresh if the token is valid
 * @returns [user, cookie | null]
 * @throws if token invalid
 */
export declare function verifyTokenAndRefresh(token: string, forceRefresh?: boolean): Promise<[UserToken, LoginCookie | null]>;
declare const _default: typeof import("./main.js");
export default _default;
