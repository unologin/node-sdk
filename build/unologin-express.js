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
exports.logoutHandler = exports.loginEventHandler = exports.requireLogin = exports.parseLogin = exports.onAuthError = exports.debug_useSecureCookies = void 0;
const main_1 = require("./main");
// should cookies use the "secure" attribute?
let useSecureCookies = true;
// default cookie options
const cookies = {
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
/**
 * Completes cookie options
 * @param opts cookie options
 * @returns default cookie options
 */
function completeCookieOptions(opts) {
    const cookie = Object.assign(Object.assign({}, opts), { domain: (0, main_1.getOptions)().cookiesDomain, 
        // always use secure cookies if not in dev environment
        // this is redundant as debug_useSecureCookies will be ignored but it won't hurt
        secure: useSecureCookies || (process.env.NODE_ENV !== 'development'), 
        // [!] TODO: (UN-72) using 'none' is a temporary fix for the behavior of omitting sameSite on chrome
        sameSite: (0, main_1.getOptions)().cookieSameSite || 'none' });
    if (cookie.maxAge === undefined) {
        delete cookie.maxAge;
    }
    return cookie;
}
let authErrorHandler = (req, res) => {
    var _a;
    logoutHandler(req, res);
    res.status(401);
    res.send('Auth error: ' + ((_a = res.locals.unologin) === null || _a === void 0 ? void 0 : _a.msg) || 'unknown error');
};
/**
 * [FOR LOCAL TESTING ONLY] allows to enable/disable secure cookies.
 * @param b useSecureCookies
 * @returns void
 */
function 
// eslint-disable-next-line camelcase
debug_useSecureCookies(b) {
    if (process.env.NODE_ENV === 'development') {
        useSecureCookies = b;
        if (!b) {
            console.warn('\x1b[31m%s\x1b[0m', '[UNOLOGIN EXPRESS] SECURE COOKIES HAVE BEEN DISABLED.\n' +
                '                   DO THIS FOR LOCAL TESTING ONLY!');
        }
    }
    else {
        console.warn('\x1b[31m%s\x1b[0m', '[UNOLOGIN EXPRESS] REFUSING debug_useSecureCookies call.\n' +
            '                   NODE_ENV != "development"!');
    }
}
exports.debug_useSecureCookies = debug_useSecureCookies;
/**
 * Decide what to do on auth error.
 *
 * @param handler Express handler
 * @returns void
 */
function onAuthError(handler) {
    authErrorHandler = handler;
}
exports.onAuthError = onAuthError;
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
function parseLogin(req, res, next) {
    var _a, _b;
    var _c;
    return __awaiter(this, void 0, void 0, function* () {
        const token = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a._uno_appLoginToken;
        (_c = res.locals).unologin || (_c.unologin = {});
        // only try to parse the token if the user provides one
        if (token) {
            try {
                const [user, cookie] = yield (0, main_1.verifyTokenAndRefresh)(token);
                // cookie has been refreshed
                if (cookie) {
                    setCookies(res, cookie);
                }
                res.locals.unologin.user = user;
                next();
            }
            catch (e) {
                if ((_b = e.isAuthError) === null || _b === void 0 ? void 0 : _b.call(e)) {
                    res.locals.unologin.msg = e.message;
                    yield authErrorHandler(req, res);
                }
                else {
                    // pass the error to the express error handler
                    next(e);
                }
            }
        }
        else {
            next();
        }
    });
}
exports.parseLogin = parseLogin;
/**
 * Only executes next() if the user is logged in.
 * Requires parseLogin middleware
 *
 * @param req express req
 * @param res express res
 * @param next express next
 * @returns void
 */
function requireLogin(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const { user } = res.locals.unologin;
        if (user) {
            next();
        }
        else {
            res.locals.unologin.msg = 'not logged in';
            yield authErrorHandler(req, res);
        }
    });
}
exports.requireLogin = requireLogin;
/**
 * Sets login and login state cookies
 * @param res res
 * @param cookie cookie
 * @returns void
 */
function setCookies(res, cookie) {
    res.cookie(cookies.login.name, cookie.value, completeCookieOptions(Object.assign(Object.assign({}, cookies.login.options), { maxAge: cookie.maxAge })));
    res.cookie(cookies.loginState.name, 'success', completeCookieOptions(Object.assign(Object.assign({}, cookies.loginState.options), { maxAge: cookie.maxAge })));
}
/**
 * Express middleware for handling the login process.
 *
 * @param req express req
 * @param res express res
 * @param next express next
 * @returns void
 */
function loginEventHandler(req, res, next) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        // token provided by the user
        const token = (req.query.token || req.body.token);
        // error message in case an error occurs
        let msg;
        try {
            // verify the login token
            const [, cookie] = yield (0, main_1.verifyTokenAndRefresh)(token, 
            // force refresh token on login
            true);
            setCookies(res, cookie);
        }
        catch (e) {
            if ((_a = e.isAuthError) === null || _a === void 0 ? void 0 : _a.call(e)) {
                msg = e.message;
            }
            else {
                next(e);
                return;
            }
        }
        // construct a url for the unologin front end to consume the result
        const url = new URL(decodeURIComponent(req.query.origin) ||
            (0, main_1.getOptions)().realm.frontendUrl);
        url.searchParams.set('loginHandlerSuccess', msg ? 'false' : 'true');
        url.searchParams.set('loginHandlerMsg', msg);
        url.searchParams.set('appId', (0, main_1.getOptions)().appId);
        url.searchParams.set('client', 'Web');
        res.redirect(url.href);
        res.send();
    });
}
exports.loginEventHandler = loginEventHandler;
/**
 * Logs out a user and calls next()
 *
 * @param req express
 * @param res express
 * @param next express
 * @returns void
 */
function logoutHandler(req, res, next) {
    // reset all cookies
    for (const cookie of Object.values(cookies)) {
        // reset the cookie by immediately expiring it
        res.cookie(cookie.name, 
        // replace the value
        'deleted', Object.assign(Object.assign({}, completeCookieOptions(cookie.options)), { 
            // maxAge: 0 has shown some weird behavior
            maxAge: 1 }));
    }
    next === null || next === void 0 ? void 0 : next();
}
exports.logoutHandler = logoutHandler;
