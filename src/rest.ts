

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

/**
 * Wrapper around a REST GET request
 */
export class GetCursor<T>
{
  private lastDocument : T | null = null;

  private hasNextBatch = true;

  /** */
  constructor(
    public readonly client : Pick<IUnologinClient, 'request'>,
    public readonly resource : string,
    public readonly query : URLSearchParams = new URLSearchParams(),
  ) {}

  /**
   * @returns Promise of next batch in iterator
   */
  public async nextBatch()
  {
    if (this.lastDocument !== null)
    {
      this.query.set('after', JSON.stringify(this.lastDocument));
    }

    const res = await this.client.request<GetResponse<T>>(
      'GET',
      this.resource + '?' + this.query,
    );

    this.hasNextBatch = res.results.length < res.total;
    
    this.lastDocument = res.results.length > 0 ?
      res.results[res.results.length - 1] :
      null
    ;

    return res.results;
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

      batch.forEach(fn);
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
   * Get all user documents for your app.
   * @param query optional query
   * @returns GetCursor
   */
  getUserDocuments(
    query?: URLSearchParams,
  ) : GetCursor<UserDocument>
  {
    return new GetCursor(
      this.client,
      this.getAppUrl() + '/users',
      query,
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
