"use strict";
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
const errors_1 = require("./errors");
/**
 * HTTP handlers for ExpressJS and NextJS.
 */
class HttpHandlers {
    /**
     * @param client unologin instance
     */
    constructor(client) {
        this.client = client;
        this.loginSuccessHandler = null;
        /**
         *
         * @param req req
         * @param res res
         * @param error error
         * @returns void
         */
        this.authErrorHandler = (req, res, error) => {
            this.resetLoginCookies(res);
            res.status(401);
            res.send('Auth error: ' + error.message || 'unknown error');
        };
        /** Should cookies use the "secure" attribute? */
        this.useSecureCookies = true;
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
     * Completes cookie options
     * @param opts cookie options
     * @returns default cookie options
     */
    completeCookieOptions(opts) {
        const cookie = Object.assign(Object.assign({}, opts), { domain: this.client.getOptions().cookiesDomain, 
            // always use secure cookies if not in dev environment
            // this is redundant as debug_useSecureCookies will be ignored but it won't hurt
            secure: this.useSecureCookies || (process.env.NODE_ENV !== 'development'), 
            // [!] TODO: (UN-72) using 'none' is a temporary fix for the behavior of omitting sameSite on chrome
            sameSite: this.client.getOptions().cookieSameSite || 'none' });
        if (cookie.maxAge === undefined) {
            delete cookie.maxAge;
        }
        return cookie;
    }
    /**
     * Decide what to do on auth error.
     *
     * @param handler Express handler
     * @returns void
     */
    onAuthError(handler) {
        this.authErrorHandler = handler;
    }
    /**
     * Add a hook that is called after the login event has finished but before the response is sent to the client.
     *
     *
     * {@link getUserToken}(res) will be available regardless of {@link parseLogin}.
     *
     * @param handler Express handler, may be asynchronous
     * @returns void
     */
    onLoginSuccess(handler) {
        this.loginSuccessHandler = handler;
    }
    /**
     *
     * @param res rest
     * @param cookie cookie to set
     * @param options cookie options
     * @returns void
     */
    setLoginCookies(res, cookie, options = {}) {
        this.setCookie(res, this.cookies.login.name, cookie.value, Object.assign(Object.assign({ maxAge: cookie.maxAge }, this.cookies.login.options), this.completeCookieOptions(options)));
        this.setCookie(res, this.cookies.loginState.name, 'success', Object.assign(Object.assign({ maxAge: cookie.maxAge }, this.cookies.loginState.options), this.completeCookieOptions(options)));
    }
    /**
     * Resets/deletes login cookies.
     * @param res res
     * @returns void
     */
    resetLoginCookies(res) {
        // reset the cookie by immediately expiring it
        this.setLoginCookies(res, 
        // maxAge: 0 has shown weird behavior
        { value: 'deleted', maxAge: 1 });
    }
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
    parseLogin(req, res, next) {
        var _a, _b;
        var _c;
        return __awaiter(this, void 0, void 0, function* () {
            const token = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a[this.cookies.login.name];
            if (next) {
                (_c = res.locals).unologin || (_c.unologin = {});
            }
            // only try to parse the token if the user provides one
            if (token) {
                try {
                    const [user, cookie] = yield this.client.verifyTokenAndRefresh(token);
                    // cookie has been refreshed
                    if (cookie) {
                        this.setLoginCookies(res, cookie);
                    }
                    if (next) {
                        res.locals.unologin.user = user;
                        next();
                    }
                    return user;
                }
                catch (e) {
                    if (e instanceof errors_1.APIError && ((_b = e.isAuthError) === null || _b === void 0 ? void 0 : _b.call(e))) {
                        yield this.authErrorHandler(req, res, e);
                    }
                    if (next) {
                        return null;
                    }
                    else {
                        throw e;
                    }
                }
            }
            next === null || next === void 0 ? void 0 : next();
            return null;
        });
    }
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
                cookie && this.setLoginCookies(res, cookie);
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
            const url = new URL(decodeURIComponent(req.query.origin) ||
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
exports.default = HttpHandlers;
