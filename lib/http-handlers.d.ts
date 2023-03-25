/**
 * @module http-handlers
 *
 */
import type { CookieOptions, Request as ExpressRequest, Response as ExpressResponse } from 'express';
import type { NextApiRequest, NextApiResponse } from 'next';
import { APIError } from './errors';
import { IUnologinClient, LoginCookie, UserHandle, UserToken } from './types';
export type ExpressOrNextRequest = ExpressRequest | NextApiRequest;
export type ExpressOrNextResponse = ExpressResponse | NextApiResponse;
export type AuthErrorHandler<Request extends ExpressOrNextRequest = ExpressOrNextRequest, Response extends ExpressOrNextResponse = ExpressOrNextResponse> = (req: Request, res: Response, error: APIError) => unknown | Promise<unknown>;
export type LoginSuccessHandler<Request extends ExpressOrNextRequest = ExpressOrNextRequest, Response extends ExpressOrNextResponse = ExpressOrNextResponse> = (req: Request, res: Response, user: UserToken) => unknown | Promise<unknown>;
/**
 * Low-level HTTP request handlers and utility functions
 * that can be used by Express, Next, or other server frameworks.
 *
 */
export declare abstract class HttpHandlers<Request extends ExpressOrNextRequest = ExpressOrNextRequest, Response extends ExpressOrNextResponse = ExpressOrNextResponse> {
    readonly client: IUnologinClient;
    protected loginSuccessHandler: LoginSuccessHandler<Request, Response> | null;
    /**
     * Executed when encountering an authentication error.
     *
     * @see {@link errors.APIError.isAuthError}
     *
     * @param req req
     * @param res res
     * @param error error
     * @returns void
     */
    protected authErrorHandler: AuthErrorHandler<Request, Response>;
    /** List of cookies used and their default options. */
    private cookies;
    /**
     * @param client unologin instance
     */
    constructor(client: IUnologinClient);
    /**
     * Completes cookie options.
     * @param opts cookie options
     * @returns default cookie options
     */
    completeCookieOptions(opts: CookieOptions): CookieOptions;
    /**
     * Result of {@link getUserTokenOptional} may be stored in with the response object.
     *
     * This function acts as a helper to retrieve the cached value.
     *
     * This function is meant to be used in conjunction with Express-like frameworks
     * where one middleware function is called after another,
     * passing values using ```res.locals```.
     *
     * @internal
     *
     * @see {@link setCachedUserToken}
     *
     * @param res res
     * @returns parsed user token cached in ```res.locals```
     */
    protected getCachedUserToken(res: Response): UserToken | null;
    /**
     *
     * @see {@link getCachedUserToken}
     * @param res res
     * @param userToken token or null
     *
     * @returns void
     */
    protected setCachedUserToken(res: Response, userToken: UserToken | null): void;
    /**
     * Returns a {@link types.UserHandle} from the current request.
     * Returns ```null``` if the request contains no login information.
     *
     * **IMPORTANT**:
     *
     * This function is synchronous and the UserHandle can
     * therefore not be trusted to be authenticated.
     *
     * The returned UserHandle **can** however be used in any API call that accepts a UserHandle
     * as a parameter.
     *
     * In this case, the authentication happens on the unologin API.
     *
     * Use {@link getUserTokenOptional} for optional authentication.
     * Use {@link getUserToken} for required authentication.
     *
     * @param req req
     * @param res res
     * @returns UserHandle | null
     */
    getUserHandleNoAuth(req: Request, res: Response): UserHandle | null;
    /**
     * Authenticates the user and returns a Promise to the {@link types.UserToken}.
     *
     * Requires the user to be logged in.
     *
     * The resolved {@link types.UserToken} is authenticated and *can be trusted*.
     *
     * @see {@link getUserTokenOptional} for optional authentication.
     *
     * @throws {@link errors.APIError} 403 unauthorized if not logged in.
     * @throws {@link errors.APIError} 403 unauthorized if login token invalid.
     *
     * @param req req
     * @param res res
     *
     * @returns Promise<UserToken>
     */
    getUserToken(req: Request, res: Response): Promise<UserToken>;
    /**
     * Authenticates the user and returns a Promise to the {@link types.UserToken}.
     *
     * Does not require the user to be logged in.
     * Does nothing if no login cookie is present and returns null.
     *
     * The resolved {@link types.UserToken} is authenticated and *can be trusted* if not null.
     *
     * Requires a cookie parser.
     *
     * @see {@link getUserToken} for required authentication.
     *
     * @param req req
     * @param res res
     * @returns Promise<UserToken>
     */
    getUserTokenOptional(req: Request, res: Response): Promise<UserToken | null>;
    /**
     * Decide what to do on auth error.
     *
     * @see {authErrorHandler}
     *
     * @param handler Express handler
     * @returns void
     */
    onAuthError(handler: AuthErrorHandler<Request, Response>): void;
    /**
     * Add a callback that is called after the login event has
     * finished but before the response is sent to the client.
     *
     * The {@link types.UserToken} passed to ```handler```
     * is authenticated an *can be trusted*.
     *
     * @param handler (req, res, userToken) => unknown
     * @returns void
     */
    onLoginSuccess(handler: LoginSuccessHandler<Request, Response>): void;
    /**
     * Framework specific implementation required.
     *
     * @internal
     *
     * @param req req
     * @param res res
     * @param name name
     * @param value value
     * @param options cookie options
     */
    protected abstract setCookie(req: Request, res: Response, name: string, value: string, options: CookieOptions): void;
    /**
     * Set the login cookies for a response.
     *
     * @internal
     *
     * @param req req
     * @param res rest
     *
     * @param cookie cookie to set
     * @param options cookie options
     * @returns void
     */
    protected setLoginCookies(req: Request, res: Response, cookie: LoginCookie, options?: CookieOptions): void;
    /**
     * Resets/deletes login cookies.
     *
     * @param req req
     * @param res res
     * @returns void
     */
    protected resetLoginCookies(req: Request, res: Response): void;
    /**
     *
     * @param req req
     * @param _ res (not used)
     * @returns URL
     */
    getLoginUrlFromLoginEvent(req: Request, _: Response): URL;
    /**
     * Handles the unologin login event.
     * Returns a URL to redirect the user to.
     *
     * @internal
     *
     * @param req req
     * @param res res
     * @returns Promise<URL> to redirect the user to
     */
    handleLoginEvent(req: Request, res: Response): Promise<{
        url: URL;
    }>;
}
export default HttpHandlers;
