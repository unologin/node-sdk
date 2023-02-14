import { Request, Response, Handler, NextFunction } from 'express';
type AuthErrorHandler = (req: Request, res: Response) => unknown | Promise<unknown>;
/**
 * [FOR LOCAL TESTING ONLY] allows to enable/disable secure cookies.
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
 * Adds "user"-key to res.locals.unologin Requires a cookie parser.
 * Does nothing if no login cookie is present.
 *
 * @param req req
 * @param res res
 * @param next next
 * @returns Promise<void>
 */
export declare const parseLogin: Handler;
/**
 * Only executes next() if the user is logged in.
 * Requires parseLogin middleware
 *
 * @param req req
 * @param res res
 * @param next next
 * @returns Promise<void>
 */
export declare const requireLogin: Handler;
/**
 * Express middleware for handling the login process.
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
export {};
