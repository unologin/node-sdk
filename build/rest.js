"use strict";
/**
 * Wrapper around the unolog·in REST API for querying resources.
 *
 * [Documentation for the HTTP-API](https://dashboard.unolog.in/docs/http-api).
 *
 * @module rest
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
exports.UnologinRestApi = exports.GetCursor = exports.userHandleToQuery = exports.validateUserHandleSchema = void 0;
const errors_1 = require("./errors");
/**
 * Validates that the provided UserHandle is complete and can be used to query users.
 * Passing an invalid user handle may lead to empty queries, leading to undefined behavior.
 * @param handle {@link types.UserHandle}
 * @returns handle {@link types.UserHandle} if valid
 * @throws TypeError
 */
function validateUserHandleSchema(handle) {
    if (('appLoginToken' in handle && (typeof handle.appLoginToken) === 'string') ||
        ('asuId' in handle && (typeof handle.asuId) === 'string')) {
        return handle;
    }
    else {
        throw new TypeError('Invalid user handle: \n' + JSON.stringify(handle, null, 2));
    }
}
exports.validateUserHandleSchema = validateUserHandleSchema;
/**
 * Validates user handle and converts it into URLSearchParams.
 *
 * @param handle {@link types.UserHandle}
 * @returns URLSearchParams for the user handle.
 */
function userHandleToQuery(handle) {
    return new URLSearchParams(validateUserHandleSchema(handle));
}
exports.userHandleToQuery = userHandleToQuery;
/**
 * Wrapper around a REST GET request
 */
class GetCursor {
    /** */
    constructor(client, resource, query = new URLSearchParams()) {
        this.client = client;
        this.resource = resource;
        this.query = query;
        this.hasNextBatch = true;
        this.continuationToken = null;
    }
    /**
     * @returns Promise of next batch in iterator
     */
    nextBatch() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.continuationToken !== null) {
                this.query.set('after', JSON.stringify(this.continuationToken));
            }
            const res = yield this.client.request('GET', this.resource + '?' + this.query);
            this.hasNextBatch = res.results.length < res.total;
            const sortBy = (this.query.get('sortBy') || '_id');
            const lastElement = res.results[res.results.length - 1] || null;
            this.continuationToken = lastElement &&
                (typeof (lastElement) === 'object' &&
                    sortBy in lastElement ?
                    // when using a sortBy statement, the token can be reduced to the sort key
                    { [sortBy]: lastElement[sortBy] } :
                    // otherwise, the element itself is the continuation token
                    lastElement);
            return {
                results: res.results,
                continuationToken: this.continuationToken,
            };
        });
    }
    /** @returns continuation token */
    getContinuationToken() {
        return this.continuationToken;
    }
    /** @returns boolean */
    batchesEmpty() {
        return !this.hasNextBatch;
    }
    /**
     * Run the provided function for each element in the cursor.
     * @param fn callback function
     * @returns Promise<void>
     */
    forEach(fn) {
        return __awaiter(this, void 0, void 0, function* () {
            while (this.hasNextBatch) {
                const batch = yield this.nextBatch();
                batch.results.forEach(fn);
            }
        });
    }
    /** @returns full cursor contents as an array */
    toArray() {
        const values = [];
        return this.forEach((v) => values.push(v))
            .then(() => values);
    }
}
exports.GetCursor = GetCursor;
/**
 *
 */
class UnologinRestApi {
    /** */
    constructor(client) {
        this.client = client;
    }
    /**
     * @returns appUrl
     */
    getAppUrl() {
        return `/apps/${this.client.getOptions().appId}`;
    }
    /**
     * @param query query
     * @returns URLSearchParams
     */
    queryToUrlSearchParams(query) {
        return new URLSearchParams(Object.entries(query)
            .map(([k, v]) => [
            k,
            typeof (v) === 'object' ?
                JSON.stringify(v) :
                v,
        ]));
    }
    /**
     * Get a cursor for all users matching the provided query.
     * @param query optional query according to [the query schema](https://v1.unolog.in/schemas/apps/:appId/users/query)
     * @returns GetCursor
     */
    getUserDocuments(query = {}) {
        return new GetCursor(this.client, this.getAppUrl() + '/users', query instanceof URLSearchParams ?
            query :
            this.queryToUrlSearchParams(query));
    }
    /**
     * Get a specific user document.
     * @param handle {@link types.UserHandle}
     * @returns user document
     */
    getUserDocument(handle) {
        return __awaiter(this, void 0, void 0, function* () {
            const { results } = yield this.client.request('GET', this.getAppUrl() + '/users/?' + userHandleToQuery(handle));
            if (results.length > 0) {
                return results[0];
            }
            else {
                throw new errors_1.APIError(404, 'User not found.', { handle });
            }
        });
    }
}
exports.UnologinRestApi = UnologinRestApi;
