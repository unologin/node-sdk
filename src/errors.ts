
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
    public message: string,
    public data: any,
  ) 
  {
    super(message);
  }

  /**
   * @returns true if the error was caused by missing/invalid credentials
   */
  isAuthError() : boolean
  {
    return !!(this.code === 401 && this.data?.param === 'user');
  }
}
