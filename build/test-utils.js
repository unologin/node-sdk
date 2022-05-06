"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/**
 * @param appId appId
 * @returns fake API-token that can be used for local testing
 */
function createApiToken(appId) {
    return jsonwebtoken_1.default.sign({ appId }, 'guest');
}
exports.createApiToken = createApiToken;
