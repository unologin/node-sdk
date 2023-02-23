"use strict";
/**
 * @module key-manager
 * @hidden
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
/**
 * Handles fetching and caching of public keys.
 */
class KeyManager {
    /** */
    constructor(client) {
        this.client = client;
        // cached public key for verifying login tokens
        this.loginTokenKey = null;
    }
    /**
     * Ensures that the key passed has the correct structure.
     * @param key key
     * @returns key if valid
     * @throws Error otherwise
     */
    checkLoginTokenKey(key) {
        if (typeof (key) === 'object' &&
            typeof (key['data']) === 'string' &&
            key['data'].startsWith('-----BEGIN PUBLIC KEY-----\n')) {
            return key;
        }
        else {
            throw new Error('Invalid public key returned by API: ' + JSON.stringify(key));
        }
    }
    /**
     * @returns {Promise<PublicKey>} key for login token verification
     */
    getLoginTokenKey() {
        return __awaiter(this, void 0, void 0, function* () {
            const key = this.loginTokenKey;
            if ((key === null || key === void 0 ? void 0 : key.data) &&
                (
                // key has no expiration
                !key.expiresIn ||
                    // or key has not expired yet
                    (key.createdAt + key.expiresIn > Date.now()))) {
                return key;
            }
            else {
                const newKey = yield this.client.request('GET', '/public-keys/app-login-token').then((key) => this.checkLoginTokenKey(key));
                this.loginTokenKey = newKey;
                return newKey;
            }
        });
    }
}
exports.default = KeyManager;
