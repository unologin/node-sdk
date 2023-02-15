/**
 * Exports [express.js](https://expressjs.com/) handlers and utility.
 *
 * Example of a fully configured express server using unolog·in.
 *
 * ```javascript
 * [[include:example/example-express-server.js]]
 * ```
 *
 * @module express
 */
import { Request, Response, Handler, NextFunction } from 'express';
import { UserToken } from './types';
export type AuthErrorHandler = (req: Request, res: Response) => unknown | Promise<unknown>;
export type LoginSuccessHandler = (req: Request, res: Response) => unknown | Promise<unknown>;
/**
 * Enable/disable secure cookies.
 *
 * Calls will be ignored with a warning unless ```process.env``` is set to ```'development'```
 *
 * You should *always* use secure cookies in production!
 *
 * @param b useSecureCookies
 * @returns void
 */
export declare function debug_useSecureCookies(b: boolean): void;
/**
 * Decide what to do on auth error.
 *
 * @param handler Express handler
 * @returns void
 */
export declare function onAuthError(handler: AuthErrorHandler): void;
/**
 * Add a hook that is called after the login event has finished but before the response is sent to the client.
 *
 *
 * {@link getUserToken}(res) will be available regardless of {@link parseLogin}.
 *
 * @param handler Express handler, may be asynchronous
 * @returns void
 */
export declare function onLoginSuccess(handler: LoginSuccessHandler): void;
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
export declare function getUserToken(res: Response): UserToken | null;
/**
 * Populates {@link getUserToken} with the user token if the user is logged in.
 * Does nothing if no login cookie is present.
 * Requires a cookie parser.
 *
 * @param req req
 * @param res res
 * @param next next
 * @returns Promise<void>
 */
export declare const parseLogin: Handler;
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
export declare const requireLogin: Handler;
/**
 * Express middleware for handling the login event.
 *
 * @see {@link onLoginSuccess} for custom behavior
 *
 * @param req req
 * @param res res
 * @param next next
 * @returns Promise<void>
 */
export declare const loginEventHandler: Handler;
/**
 * Logs out a user and calls next()
 *
 * @param _ req
 * @param res res
 * @param next next
 * @returns Promise<void>
 */
export declare const logoutHandler: (_: Request, res: Response, next?: NextFunction) => Promise<void>;
