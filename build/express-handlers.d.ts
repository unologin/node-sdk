/**
 * Exports [express.js](https://expressjs.com/) handlers and utility.
 *
 * Example of a fully configured express server using unolog·in.
 *
 * ```javascript
 * [[include:example/example-express-server.js]]
 * ```
 *
 * @module express-handlers
 */
import { Request, Response, CookieOptions, Handler, NextFunction } from 'express';
import { IUnologinClient, UserToken } from './types';
import HttpHandlers from './http-handlers';
export type AuthErrorHandler = (req: Request, res: Response) => unknown | Promise<unknown>;
export type LoginSuccessHandler = (req: Request, res: Response) => unknown | Promise<unknown>;
/**
 * Implements HttpHandlers for Express.
 */
export default class ExpressHandlers extends HttpHandlers {
    /**
     *
     * @param client client
     *
     */
    constructor(client: IUnologinClient);
    /**
     * Logs out a user and calls next()
     *
     * @param _ req
     * @param res res
     * @param next next
     * @returns Promise<void>
     */
    logoutHandler: (_: Request, res: Response, next?: NextFunction) => Promise<void>;
    /**
     * Express wrapper for {@link HttpHandlers.handleLoginEvent}.
     *
     * @see {@link HttpHandlers.handleLoginEvent}
     *
     * @param req req
     * @param res res
     * @param next next
     * @returns Promise<void>
     */
    readonly loginEventHandler: Handler;
    /**
     * Implements cookie setting for Express.
     * @param res res
     * @param name name
     * @param value value
     * @param options options
     * @returns void
     */
    setCookie(res: Response, name: string, value: string, options: CookieOptions): void;
    /**
     * Extracts the UserToken from res.locals.unologin.
     *
     * Returns null if not logged in.
     *
     * Will only return the token if preceded by {@link parseLogin} or in {@link onLoginSuccess}. Will return ```null``` otherwise.
     *
     * @param res Express Response object
     * @returns {UserToken | null} token
     */
    getUserToken(res: Response): UserToken | null;
    /**
     *
     * Only executes the next handler if the user is logged in.
     *
     * Will trigger the {@link AuthErrorHandler} otherwise.
     *
     * Requires the {@link parseLogin} middleware mounted before it.
     *
     * @see {@link onAuthError} to configure the error behavior.
     *
     * @see {@link parseLogin} middleware
     *
     *
     * @param req req
     * @param res res
     * @param next next
     * @returns Promise<void>
     */
    readonly requireLogin: Handler;
}
