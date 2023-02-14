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
exports.UnologinRestApi = exports.GetCursor = void 0;
/**
 * Wrapper around a REST GET request
 */
class GetCursor {
    /** */
    constructor(client, resource, query = new URLSearchParams()) {
        this.client = client;
        this.resource = resource;
        this.query = query;
        this.lastDocument = null;
        this.hasNextBatch = true;
    }
    /**
     * @returns Promise of next batch in iterator
     */
    nextBatch() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.lastDocument !== null) {
                this.query.set('after', JSON.stringify(this.lastDocument));
            }
            const res = yield this.client.request('GET', this.resource + '?' + this.query);
            this.hasNextBatch = res.results.length < res.total;
            this.lastDocument = res.results.length > 0 ?
                res.results[res.results.length - 1] :
                null;
            return res.results;
        });
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
                batch.forEach(fn);
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
     * Get all user documents for your app.
     * @param query optional query
     * @returns GetCursor
     */
    getUserDocuments(query) {
        return new GetCursor(this.client, this.getAppUrl() + '/users', query);
    }
    /**
     * Get a specific user document.
     * @param user user token
     * @returns user document
     */
    getUserDocument({ asuId }) {
        return this.client.request('GET', this.getAppUrl() + '/users/' + asuId);
    }
}
exports.UnologinRestApi = UnologinRestApi;
