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
/**
 * Implements HttpHandlers for Express.
 */
export default class ExpressHandlers extends HttpHandlers<Request, Response> {
    /**
     *
     * @param client client
     *
     */
    constructor(client: IUnologinClient);
    /**
     *
     * Middleware to parse login information.
     *
     * Will let any request pass where the user is not logged in.
     *
     * @see {requireLogin} for making sure only authenticated requests get past.
     *
     * @param req request
     * @param res response
     * @param next optional next function
     * @returns Promise<UserToken | null>
     */
    parseLogin(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Logs out a user and calls next()
     *
     * @param req req
     * @param res res
     * @param next next
     * @returns Promise<void>
     */
    logoutHandler: (req: Request, res: Response, next?: NextFunction) => Promise<void>;
    /**
     * Express wrapper for {@link http-handlers.HttpHandlers.handleLoginEvent}.
     *
     * @see {@link http-handlers.HttpHandlers.handleLoginEvent}
     *
     * @param req req
     * @param res res
     * @param next next
     * @returns Promise<void>
     */
    readonly loginEventHandler: Handler;
    /**
     * Implements cookie setting for Express.
     * @param _ req (not used)
     * @param res res
     * @param name name
     * @param value value
     * @param options options
     * @returns void
     */
    setCookie(_: Request, res: Response, name: string, value: string, options: CookieOptions): void;
    /**
     * Extracts the cached UserToken from previous call to
     * {@link getUserTokenOptional} or {@link getUserToken}
     *
     * Returns null if not logged in.
     *
     * Will only return the token if preceded by {@link parseLogin} or in {@link onLoginSuccess}.
     * Will return ```null``` otherwise.
     *
     * Use {@link getUserToken} for an authenticated async version.
     *
     * @param res Express Response object
     * @returns {UserToken | null} token
     */
    getUserTokenSync(res: Response): UserToken | null;
    /**
     *
     * Only executes the next handler if the user is logged in.
     *
     * Will trigger the {@link AuthErrorHandler} otherwise.
     *
     * *Must* be preceded by the {@link parseLogin} middleware.
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
