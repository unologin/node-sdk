/**
 * Wrapper around the unolog·in REST API for querying resources.
 * 
 * [Documentation for the HTTP-API](https://dashboard.unolog.in/docs/http-api).
 * 
 * @module rest
 */

import {
  APIError,
} from './errors';

import type {
  UserDocument,
  IUnologinClient,
  UserHandle,
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
 * Validates that the provided UserHandle is complete and can be used to query users.
 * Passing an invalid user handle may lead to empty queries, leading to undefined behavior.
 * @param handle {@link types.UserHandle}
 * @returns handle {@link types.UserHandle} if valid
 * @throws TypeError
 */
export function validateUserHandleSchema(
  handle : UserHandle,
)
{
  if (
    ('appLoginToken' in handle && (typeof handle.appLoginToken) === 'string') ||
    ('asuId' in handle && (typeof handle.asuId) === 'string')
  )
  {
    return handle;
  }
  else 
  {
    throw new TypeError(
      'Invalid user handle: \n' + JSON.stringify(handle, null, 2),
    );
  }
}

/**
 * Validates user handle and converts it into URLSearchParams.
 * 
 * @param handle {@link types.UserHandle}
 * @returns URLSearchParams for the user handle.
 */
export function userHandleToQuery(
  handle : UserHandle,
)
{
  return new URLSearchParams(validateUserHandleSchema(handle));
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
   * @param handle {@link types.UserHandle}
   * @returns user document
   */
  async getUserDocument(
    handle : UserHandle,
  ) : Promise<UserDocument>
  {
    const { results } = await this.client.request<GetResponse<UserDocument>>(
      'GET',
      this.getAppUrl() + '/users/?' + userHandleToQuery(handle),
    );

    if (results.length > 0)
    {
      return results[0];
    }
    else 
    {
      throw new APIError(404, 'User not found.', { handle });
    }
  }
}
