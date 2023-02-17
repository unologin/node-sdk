"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const errors_1 = require("./errors");
const http_handlers_1 = __importDefault(require("./http-handlers"));
/**
 * Implements HttpHandlers for Express.
 */
class ExpressHandlers extends http_handlers_1.default {
    /**
     *
     * @param client client
     *
     */
    constructor(client) {
        super(client);
        /**
         * Logs out a user and calls next()
         *
         * @param _ req
         * @param res res
         * @param next next
         * @returns Promise<void>
         */
        this.logoutHandler = (_, res, next) => __awaiter(this, void 0, void 0, function* () {
            this.resetLoginCookies(res);
            next === null || next === void 0 ? void 0 : next();
        });
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
        this.loginEventHandler = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { url } = yield this.handleLoginEvent(req, res);
            res.redirect(url.href);
            res.send();
        });
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
        this.requireLogin = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            if (this.getUserToken(res)) {
                next();
            }
            else {
                yield this.authErrorHandler(req, res, new errors_1.APIError(401, 'Login required.', null));
            }
        });
        // the following functions were previously exported from the module
        // and not member of a class
        // some documentation includes de-structuring of unologin.express
        // which is why these functions need to be bound to this
        this.onAuthError = this.onAuthError.bind(this);
        this.parseLogin = this.parseLogin.bind(this);
        this.requireLogin = this.requireLogin.bind(this);
        this.loginEventHandler = this.loginEventHandler.bind(this);
        this.logoutHandler = this.logoutHandler.bind(this);
        this.getUserToken = this.getUserToken.bind(this);
    }
    /**
     * Implements cookie setting for Express.
     * @param res res
     * @param name name
     * @param value value
     * @param options options
     * @returns void
     */
    setCookie(res, name, value, options) {
        res.cookie(name, value, options);
    }
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
    getUserToken(res) {
        var _a;
        return ((_a = res.locals.unologin) === null || _a === void 0 ? void 0 : _a.user) || null;
    }
}
exports.default = ExpressHandlers;
