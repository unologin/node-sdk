import type { UserToken, UserDocument, IUnologinClient } from './types';
export type GetResponse<T> = {
    results: T[];
    total: number;
};
/**
 * Wrapper around a REST GET request
 */
export declare class GetCursor<T> {
    readonly client: Pick<IUnologinClient, 'request'>;
    readonly resource: string;
    readonly query: URLSearchParams;
    private lastDocument;
    private hasNextBatch;
    /** */
    constructor(client: Pick<IUnologinClient, 'request'>, resource: string, query?: URLSearchParams);
    /**
     * @returns Promise of next batch in iterator
     */
    nextBatch(): Promise<T[]>;
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
     * Get all user documents for your app.
     * @param query optional query
     * @returns GetCursor
     */
    getUserDocuments(query?: URLSearchParams): GetCursor<UserDocument>;
    /**
     * Get a specific user document.
     * @param user user token
     * @returns user document
     */
    getUserDocument({ asuId }: Pick<UserToken, 'asuId'>): Promise<unknown>;
}
