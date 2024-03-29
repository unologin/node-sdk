/**
 * Wrapper around the unolog·in REST API for querying resources.
 *
 * [Documentation for the HTTP-API](https://dashboard.unolog.in/docs/http-api).
 *
 * @module rest
 */
import type { UserDocument, IUnologinClient, UserHandle } from './types';
export type GetResponse<T> = {
    results: T[];
    total: number;
};
export type GetCursorBatch<T> = {
    results: T[];
    continuationToken: Partial<T> | null;
};
/**
 * Validates that the provided UserHandle is complete and can be used to query users.
 * Passing an invalid user handle may lead to empty queries, leading to undefined behavior.
 * @param handle {@link types.UserHandle}
 * @returns handle {@link types.UserHandle} if valid
 * @throws TypeError
 */
export declare function validateUserHandleSchema(handle: UserHandle): UserHandle;
/**
 * Validates user handle and converts it into URLSearchParams.
 *
 * @param handle {@link types.UserHandle}
 * @returns URLSearchParams for the user handle.
 */
export declare function userHandleToQuery(handle: UserHandle): URLSearchParams;
/**
 * Wrapper around a REST GET request
 */
export declare class GetCursor<T> {
    readonly client: Pick<IUnologinClient, 'request'>;
    readonly resource: string;
    readonly query: URLSearchParams;
    private hasNextBatch;
    private continuationToken;
    /** */
    constructor(client: Pick<IUnologinClient, 'request'>, resource: string, query?: URLSearchParams);
    /**
     * @returns Promise of next batch in iterator
     */
    nextBatch(): Promise<GetCursorBatch<T>>;
    /** @returns continuation token */
    getContinuationToken(): Partial<T> | null;
    /** @returns boolean */
    batchesEmpty(): boolean;
    /**
     * Run the provided function for each element in the cursor.
     * @param fn callback function
     * @returns Promise<void>
     */
    forEach<R>(fn: (t: T) => R): Promise<void>;
    /** @returns full cursor contents as an array */
    toArray(): Promise<T[]>;
}
/**
 *
 */
export declare class UnologinRestApi {
    readonly client: Pick<IUnologinClient, 'request' | 'getOptions'>;
    /** */
    constructor(client: Pick<IUnologinClient, 'request' | 'getOptions'>);
    /**
     * @returns appUrl
     */
    getAppUrl(): string;
    /**
     * @param query query
     * @returns URLSearchParams
     */
    queryToUrlSearchParams(query: object): URLSearchParams;
    /**
     * Get a cursor for all users matching the provided query.
     * @param query optional query according to [the query schema](https://v1.unolog.in/schemas/apps/:appId/users/query)
     * @returns GetCursor
     */
    getUserDocuments(query?: URLSearchParams | object): GetCursor<UserDocument>;
    /**
     * Get a specific user document.
     * @param handle {@link types.UserHandle}
     * @returns user document
     */
    getUserDocument(handle: UserHandle): Promise<UserDocument>;
}
