import { Request, Response, NextFunction } from 'express';
declare type AuthErrorHandler = (req: Request, res: Response) => unknown | Promise<unknown>;
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
 * @param req express request
 * @param res express result
 * @param next express next
 *
 * @returns void
 */
export declare function parseLogin(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Only executes next() if the user is logged in.
 * Requires parseLogin middleware
 *
 * @param req express req
 * @param res express res
 * @param next express next
 * @returns void
 */
export declare function requireLogin(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Express middleware for handling the login process.
 *
 * @param req express req
 * @param res express res
 * @param next express next
 * @returns void
 */
export declare function loginEventHandler(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Logs out a user and calls next()
 *
 * @param req express
 * @param res express
 * @param next express
 * @returns void
 */
export declare function logoutHandler(req: Request, res: Response, next?: NextFunction): void;
export {};
