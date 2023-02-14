/**
 * Wrapper around the unolog·in REST API for querying resources.
 * 
 * [Documentation for the HTTP-API](https://dashboard.unolog.in/docs/http-api).
 * 
 * @module rest
 */

import type {
  UserToken,
  UserDocument,
  IUnologinClient,
} from './types';

export type GetResponse<T> = 
{
  results: T[];
  total: number;
}

export type GetCursorBatch<T> = 
{
  results: T[];
  continuationToken: Partial<T> | null;
}

/**
 * Wrapper around a REST GET request
 */
export class GetCursor<T>
{
  private hasNextBatch = true;

  private continuationToken : Partial<T> | null = null;
  
  /** */
  constructor(
    public readonly client : Pick<IUnologinClient, 'request'>,
    public readonly resource : string,
    public readonly query : URLSearchParams = new URLSearchParams(),
  ) {}

  /**
   * @returns Promise of next batch in iterator
   */
  public async nextBatch() : Promise<GetCursorBatch<T>>
  {
    if (this.continuationToken !== null)
    {
      this.query.set('after', JSON.stringify(this.continuationToken));
    }

    const res = await this.client.request<GetResponse<T>>(
      'GET',
      this.resource + '?' + this.query,
    );

    this.hasNextBatch = res.results.length < res.total;
    
    const sortBy = (this.query.get('sortBy') || '_id') as keyof T;

    const lastElement = res.results[res.results.length - 1] || null;

    this.continuationToken = lastElement &&
      (
        typeof(lastElement) === 'object' && 
        sortBy in lastElement ?
          // when using a sortBy statement, the token can be reduced to the sort key
          { [sortBy]: lastElement[sortBy] } as Partial<T> :
          // otherwise, the element itself is the continuation token
          lastElement
      );

    return {
      results: res.results,
      continuationToken: this.continuationToken,
    };
  }

  /** @returns continuation token */
  public getContinuationToken()
  {
    return this.continuationToken;
  }

  /** @returns boolean */
  public batchesEmpty()
  {
    return !this.hasNextBatch;
  }

  /**
   * Run the provided function for each element in the cursor.
   * @param fn callback function
   * @returns Promise<void>
   */
  public async forEach<R>(fn : (t: T) => R) : Promise<void>
  {
    while (this.hasNextBatch)
    {
      const batch = await this.nextBatch();

      batch.results.forEach(fn);
    }
  }

  /** @returns full cursor contents as an array */
  public toArray()
  {
    const values : T[] = [];

    return this.forEach((v) => values.push(v))
      .then(() => values);
  }
}

/**
 * 
 */
export class UnologinRestApi
{
  /** */
  constructor(
    public readonly client : Pick<
      IUnologinClient, 
      'request' | 'getOptions'
    >,
  ) {}

  /**
   * @returns appUrl
   */
  public getAppUrl()
  {
    return `/apps/${this.client.getOptions().appId}`;
  }

  /**
   * @param query query
   * @returns URLSearchParams
   */
  public queryToUrlSearchParams(query : object)
  {
    return new URLSearchParams(
      Object.entries(query)
        .map(
          ([k, v]) => [
            k,
            typeof(v) === 'object' ?
              JSON.stringify(v) :
              v,
          ],
        ),
    );
  }

  /**
   * Get a cursor for all users matching the provided query.
   * @param query optional query according to [the query schema](https://v1.unolog.in/schemas/apps/:appId/users/query)
   * @returns GetCursor
   */
  getUserDocuments(
    query : URLSearchParams | object = {},
  ) : GetCursor<UserDocument>
  {
    return new GetCursor(
      this.client,
      this.getAppUrl() + '/users',
      query instanceof URLSearchParams ? 
        query :
        this.queryToUrlSearchParams(query),
    );
  }

  /**
   * Get a specific user document.
   * @param user user token
   * @returns user document
   */
  getUserDocument({ asuId } : Pick<UserToken, 'asuId'>)
  {
    return this.client.request(
      'GET',
      this.getAppUrl() + '/users/' + asuId,
    );
  }
}
