"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APIError = void 0;
/**
 * General API Error
 */
class APIError extends Error {
    /**
     *
     * @param code code
     * @param message msg
     * @param data data
     */
    constructor(code, message, data) {
        super(message);
        this.code = code;
        this.message = message;
        this.data = data;
    }
    /**
     * @returns true if the error was caused by missing/invalid credentials
     */
    isAuthError() {
        var _a;
        return !!(this.code === 401 && ((_a = this.data) === null || _a === void 0 ? void 0 : _a.param) === 'user');
    }
}
exports.APIError = APIError;
