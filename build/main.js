"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.verifyTokenAndRefresh = exports.verifyLoginToken = exports.getLoginTokenKey = exports.request = exports.getOptions = exports.setup = exports.decodeApiKey = exports.defaultOptions = exports.realms = exports.express = exports.rest = void 0;
const superagent_1 = __importDefault(require("superagent"));
const expressMiddleware = __importStar(require("./unologin-express"));
const errors_1 = require("./errors");
const jsonwebtoken_1 = __importStar(require("jsonwebtoken"));
const rest_1 = require("./rest");
exports.rest = new rest_1.UnologinRestApi(module.exports);
exports.express = expressMiddleware;
// public key for verifying login tokens
let loginTokenKey = null;
exports.realms = {
    live: {
        apiUrl: 'https://v1.unolog.in',
        frontendUrl: 'https://login.unolog.in',
    },
};
exports.defaultOptions = {
    realm: exports.realms.live,
    agent: superagent_1.default,
};
let options = null;
/**
 * @param key api key
 * @returns decoded key (payload)
 */
function decodeApiKey(key) {
    var _a;
    if (!key) {
        throw new Error('Invalid unolog.in API key: ' + key);
    }
    // check what type of token is used: legacy base64 token will not contain any dots, while jwts will  
    const payload = key.includes('.') ?
        jsonwebtoken_1.default.decode(key, { json: true }) :
        // legacy base64 signed token
        (_a = JSON.parse(Buffer.from(key, 'base64').toString()).payload) === null || _a === void 0 ? void 0 : _a.data;
    if (!(payload === null || payload === void 0 ? void 0 : payload.appId)) {
        throw new Error('Invalid unologin API key. Payload: ' + JSON.stringify(payload, null, 2));
    }
    return payload;
}
exports.decodeApiKey = decodeApiKey;
/**
 * @param opts setup
 * @returns void
 */
function setup(opts) {
    try {
        const token = decodeApiKey(opts.apiKey);
        const currentOptions = options || exports.defaultOptions;
        options = Object.assign(Object.assign(Object.assign({}, currentOptions), opts), { appId: token.appId });
    }
    catch (e) {
        throw new Error('malformed API key');
    }
}
exports.setup = setup;
/**
 * @returns setup
 */
function getOptions() {
    if (options) {
        return options;
    }
    else {
        throw new Error('unologin: library not set up.');
    }
}
exports.getOptions = getOptions;
/**
 * @param method http method
 * @param loc url relative to api url
 * @param body request data
 * @returns response
 */
function request(method, loc, body) {
    return __awaiter(this, void 0, void 0, function* () {
        let response;
        const url = new URL(loc, getOptions().realm.apiUrl).href;
        try {
            response = yield getOptions().agent(method, url)
                .set('Content-Type', 'application/json').set('X-API-Key', getOptions().apiKey).send(body || {});
        }
        catch (e) {
            // some agents may throw on non-2XX status codes
            // this will generally include the response with the error
            if (e.response) {
                response = e.response;
            }
            else {
                throw e;
            }
        }
        const result = response.headers['content-type']
            .startsWith('application/json') ?
            JSON.parse(response.text) :
            response.text;
        if (
        // check for 2xx status code
        response.status >= 200 &&
            response.status < 300) // successful response
         {
            return result;
        }
        else // error response
         {
            if (result &&
                typeof (result) === 'object' &&
                'code' in result &&
                'msg' in result) {
                throw new errors_1.APIError(response.status, result.msg, result.data);
            }
            else {
                throw result;
            }
        }
    });
}
exports.request = request;
/**
 *
 * @param key key
 * @returns key if valid
 * @throws error otherwise
 */
function checkLoginTokenKey(key) {
    if (getOptions().skipPublicKeyCheck ||
        (typeof (key) === 'object' &&
            typeof (key['data']) === 'string' &&
            key['data'].startsWith('-----BEGIN PUBLIC KEY-----\n'))) {
        return key;
    }
    else {
        throw new Error('Invalid public key returned by API: ' + JSON.stringify(key));
    }
}
/**
 * @returns public key for login token verification
 */
function getLoginTokenKey() {
    return __awaiter(this, void 0, void 0, function* () {
        if ((loginTokenKey === null || loginTokenKey === void 0 ? void 0 : loginTokenKey.data) &&
            (
            // key has no expiration
            !loginTokenKey.expiresIn ||
                // or key has not expired yet
                (loginTokenKey.createdAt + loginTokenKey.expiresIn > Date.now()))) {
            return loginTokenKey;
        }
        else {
            return (loginTokenKey = checkLoginTokenKey(yield request('GET', '/public-keys/app-login-token')));
        }
    });
}
exports.getLoginTokenKey = getLoginTokenKey;
/**
 * Verifies that a token is valid.
 *
 * @param token login token
 * @param args optional additional body params
 * @returns user
 *
 * @deprecated use verifyTokenAndRefresh instead
 */
function verifyLoginToken(token, args = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        return request('POST', '/users/auth', Object.assign({ user: {
                appLoginToken: token,
            } }, args));
    });
}
exports.verifyLoginToken = verifyLoginToken;
/**
 * Verifies the login token locally and refreshes the token if required.
 *
 * @param token token
 * @param forceRefresh forces a refresh if the token is valid
 * @returns [user, cookie | null]
 * @throws if token invalid
 */
function verifyTokenAndRefresh(token, forceRefresh = false) {
    return __awaiter(this, void 0, void 0, function* () {
        const key = yield getLoginTokenKey();
        try {
            const user = jsonwebtoken_1.default.verify(token, key.data);
            if (user.appId !== getOptions().appId) {
                throw new errors_1.APIError(401, 'token not for this appId', { param: 'user', user });
            }
            if (forceRefresh ||
                (
                // cookie has a refresh-header
                user.r &&
                    // cookie must be refreshed via the unologin API
                    user.r + user.iat < Date.now() / 1000)) {
                return yield request('POST', '/users/refresh', {
                    user: {
                        appLoginToken: token,
                    },
                });
            }
            else {
                return [user, null];
            }
        }
        catch (e) {
            if (e instanceof jsonwebtoken_1.JsonWebTokenError) {
                // throw an auth error
                throw new errors_1.APIError(401, e.message, { param: 'user' });
            }
            else {
                throw e;
            }
        }
    });
}
exports.verifyTokenAndRefresh = verifyTokenAndRefresh;
exports.default = module.exports;
