"use strict";
/**
 * @module http-handlers
 *
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpHandlers = void 0;
const errors_1 = require("./errors");
/**
 * Low-level HTTP request handlers and utility functions
 * that can be used by Express, Next, or other server frameworks.
 *
 */
class HttpHandlers {
    /**
     * @param client unologin instance
     */
    constructor(client) {
        this.client = client;
        this.loginSuccessHandler = null;
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
        this.authErrorHandler = (req, res, error) => {
            this.resetLoginCookies(req, res);
            res.status(401);
            res.send('Auth error: ' + error.message || 'unknown error');
        };
        /** List of cookies used and their default options. */
        this.cookies = {
            // secure session cookie for the server to read
            login: {
                name: '_uno_appLoginToken',
                options: {
                    httpOnly: true,
                },
            },
            // login state for client scripts to read
            loginState: {
                name: '_uno_loginState',
                options: {
                    httpOnly: false,
                },
            },
        };
    }
    /**
     * Completes cookie options.
     * @param opts cookie options
     * @returns default cookie options
     */
    completeCookieOptions(opts) {
        const { cookiesDomain, disableSecureCookies, cookieSameSite, } = this.client.getOptions();
        const cookie = Object.assign(Object.assign({}, opts), { domain: cookiesDomain, 
            // always use secure cookies if not in dev environment
            // this is redundant as debug_useSecureCookies will be ignored but it won't hurt
            secure: !disableSecureCookies || (process.env.NODE_ENV !== 'development'), 
            // [!] TODO: (UN-72) using 'none' is a temporary fix for the behavior of omitting sameSite on chrome
            sameSite: cookieSameSite || 'none' });
        if (cookie.maxAge === undefined) {
            delete cookie.maxAge;
        }
        return cookie;
    }
    /**
     * Result of {@link parseLogin} may be stored in with the response object.
     *
     * This function acts as a helper to retrieve the cached value.
     *
     * This function is meant to be used in conjunction with Express-like frameworks
     * where one middleware function is called after another,
     * passing values using ```res.locals```.
     *
     * @internal
     *
     * @param res res
     * @returns parsed user token cached in ```res.locals```
     */
    getCachedUserToken(res) {
        var _a, _b;
        return ((_b = (_a = res.locals) === null || _a === void 0 ? void 0 : _a.unologin) === null || _b === void 0 ? void 0 : _b.user) || null;
    }
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
    getUserHandleNoAuth(req, res) {
        const cachedUser = this.getCachedUserToken(res);
        if (cachedUser) {
            return cachedUser;
        }
        else {
            const appLoginToken = req.cookies[this.cookies.login.name];
            if (appLoginToken) {
                return { appLoginToken };
            }
        }
        return null;
    }
    /**
     * Authenticates the user and returns a Promise to the {@link types.UserToken}.
     *
     * Requires the user to be logged in.
     *
     * The resolved {@link types.UserToken} is authenticated and *can be trusted*.
     *
     * @see {@link parseLogin} for optional authentication.
     *
     * @throws {@link errors.APIError} 403 unauthorized if not logged in.
     * @throws {@link errors.APIError} 403 unauthorized if login token invalid.
     *
     * @param req req
     * @param res res
     *
     * @returns Promise<UserToken>
     */
    getUserToken(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const userToken = yield this.getUserTokenOptional(req, res);
            if (userToken) {
                return userToken;
            }
            else {
                throw new errors_1.APIError(401, 'Login required.', { param: 'user' });
            }
        });
    }
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
    getUserTokenOptional(req, res) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const token = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a[this.cookies.login.name];
            const cached = this.getCachedUserToken(res);
            if (cached) {
                return cached;
            }
            // only try to parse the token if the user provides one
            if (token) {
                try {
                    const [user, cookie] = yield this.client.verifyTokenAndRefresh(token);
                    // cookie needs to be refreshed
                    if (cookie) {
                        this.setLoginCookies(req, res, cookie);
                    }
                    return user;
                }
                catch (e) {
                    if (e instanceof errors_1.APIError && ((_b = e.isAuthError) === null || _b === void 0 ? void 0 : _b.call(e))) {
                        yield this.authErrorHandler(req, res, e);
                    }
                    throw e;
                }
            }
            return null;
        });
    }
    /**
     * Decide what to do on auth error.
     *
     * @see {authErrorHandler}
     *
     * @param handler Express handler
     * @returns void
     */
    onAuthError(handler) {
        this.authErrorHandler = handler;
    }
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
    onLoginSuccess(handler) {
        this.loginSuccessHandler = handler;
    }
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
    setLoginCookies(req, res, cookie, options = {}) {
        this.setCookie(req, res, this.cookies.login.name, cookie.value, Object.assign(Object.assign({ maxAge: cookie.maxAge }, this.cookies.login.options), this.completeCookieOptions(options)));
        this.setCookie(req, res, this.cookies.loginState.name, 'success', Object.assign(Object.assign({ maxAge: cookie.maxAge }, this.cookies.loginState.options), this.completeCookieOptions(options)));
    }
    /**
     * Resets/deletes login cookies.
     *
     * @param req req
     * @param res res
     * @returns void
     */
    resetLoginCookies(req, res) {
        // reset the cookie by immediately expiring it
        this.setLoginCookies(req, res, 
        // maxAge: 0 has shown weird behavior
        { value: 'deleted', maxAge: 1 });
    }
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
    handleLoginEvent(req, res) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            // token provided by the user
            const token = (req.query.token || req.body.token);
            // error message in case an error occurs
            let msg = null;
            try {
                // verify the login token
                const [userToken, cookie] = yield this.client.verifyTokenAndRefresh(token, 
                // force refresh token on login
                true);
                yield ((_a = this.loginSuccessHandler) === null || _a === void 0 ? void 0 : _a.call(this, req, res, userToken));
                cookie && this.setLoginCookies(req, res, cookie);
            }
            catch (e) {
                if (e instanceof errors_1.APIError &&
                    ((_b = e.isAuthError) === null || _b === void 0 ? void 0 : _b.call(e))) {
                    msg = e.msg;
                }
                else {
                    throw e;
                }
            }
            // construct a url for the unologin front end to consume the result
            const url = new URL(req.query.origin && decodeURIComponent(req.query.origin) ||
                this.client.getOptions().realm.frontendUrl);
            url.searchParams.set('loginHandlerSuccess', msg ? 'false' : 'true');
            msg && url.searchParams.set('loginHandlerMsg', msg);
            url.searchParams.set('appId', this.client.getOptions().appId);
            url.searchParams.set('client', 'Web');
            return {
                url,
            };
        });
    }
}
exports.HttpHandlers = HttpHandlers;
exports.default = HttpHandlers;
