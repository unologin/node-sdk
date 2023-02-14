/**
 * Structures for handling errors raised by the unolog·in API. 
 * 
 * @module errors
 */


/**
 * General API Error
 */
export class APIError extends Error
{
  /**
   * 
   * @param code code
   * @param message msg
   * @param data data
   */
  constructor(
    public code : number,
    public msg: string,
    public data: any,
  ) 
  {
    super(
      `${code}: ${msg}\n\ndata: ${JSON.stringify(data, null, 2)}`, 
    );
  }

  /**
   * @returns true if the error was caused by missing/invalid credentials
   */
  isAuthError() : boolean
  {
    return !!(this.code === 401 && this.data?.param === 'user');
  }
}
