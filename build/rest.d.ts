import type { UserToken, UserDocument, IUnologinClient } from './types';
export type GetResponse<T> = {
    results: T[];
    total: number;
};
export type GetCursorBatch<T> = {
    results: T[];
    continuationToken: Partial<T> | null;
};
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
     * Get all user documents for your app.
     * @param query optional query
     * @returns GetCursor
     */
    getUserDocuments(query?: URLSearchParams | object): GetCursor<UserDocument>;
    /**
     * Get a specific user document.
     * @param user user token
     * @returns user document
     */
    getUserDocument({ asuId }: Pick<UserToken, 'asuId'>): Promise<unknown>;
}
