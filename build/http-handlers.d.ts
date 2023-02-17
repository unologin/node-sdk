import type { CookieOptions, NextFunction, Request as ExpressRequest, Response as ExpressResponse } from 'express';
import type { NextApiRequest, NextApiResponse } from 'next';
import { APIError } from './errors';
import { IUnologinClient, LoginCookie, UserToken } from './types';
type Request = ExpressRequest | NextApiRequest;
type Response = ExpressResponse | NextApiResponse;
export type AuthErrorHandler = (req: Request, res: Response, error: APIError) => unknown | Promise<unknown>;
export type LoginSuccessHandler = (req: Request, res: Response, user: UserToken) => unknown | Promise<unknown>;
/**
 * HTTP handlers for ExpressJS and NextJS.
 */
export default abstract class HttpHandlers {
    readonly client: IUnologinClient;
    protected loginSuccessHandler: LoginSuccessHandler | null;
    /**
     *
     * @param req req
     * @param res res
     * @param error error
     * @returns void
     */
    protected authErrorHandler: AuthErrorHandler;
    /** Should cookies use the "secure" attribute? */
    private useSecureCookies;
    /** List of cookies used and their default options. */
    private cookies;
    /**
     * @param client unologin instance
     */
    constructor(client: IUnologinClient);
    /**
     * Completes cookie options
     * @param opts cookie options
     * @returns default cookie options
     */
    completeCookieOptions(opts: CookieOptions): CookieOptions;
    /**
     * Decide what to do on auth error.
     *
     * @param handler Express handler
     * @returns void
     */
    onAuthError(handler: AuthErrorHandler): void;
    /**
     * Add a hook that is called after the login event has finished but before the response is sent to the client.
     *
     *
     * {@link getUserToken}(res) will be available regardless of {@link parseLogin}.
     *
     * @param handler Express handler, may be asynchronous
     * @returns void
     */
    onLoginSuccess(handler: LoginSuccessHandler): void;
    abstract setCookie(res: Response, name: string, value: string, options: CookieOptions): void;
    /**
     *
     * @param res rest
     * @param cookie cookie to set
     * @param options cookie options
     * @returns void
     */
    setLoginCookies(res: Response, cookie: LoginCookie, options?: CookieOptions): void;
    /**
     * Resets/deletes login cookies.
     * @param res res
     * @returns void
     */
    resetLoginCookies(res: Response): void;
    /**
     * Populates {@link getUserToken} with the user token if the user is logged in.
     * Does nothing if no login cookie is present.
     * Requires a cookie parser.
     *
     * TODO: Move express-logic to express-handlers!
     *
     * @param req request
     * @param res response
     * @param next optional next function
     * @returns Promise<UserToken>
     */
    parseLogin<Next extends NextFunction | undefined>(req: Request, res: Response, next?: Next): Promise<UserToken | null>;
    /**
     *
     * Populates {@link getUserToken} with the user token if the user is logged in.
     * Does nothing if no login cookie is present.
     * Requires a cookie parser.
     *
     * @param req req
     * @param res res
     * @returns url to redirect the user to
     */
    handleLoginEvent(req: Request, res: Response): Promise<{
        url: URL;
    }>;
}
export {};
