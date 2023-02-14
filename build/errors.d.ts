/**
 * General API Error
 */
export declare class APIError extends Error {
    code: number;
    msg: string;
    data: any;
    /**
     *
     * @param code code
     * @param message msg
     * @param data data
     */
    constructor(code: number, msg: string, data: any);
    /**
     * @returns true if the error was caused by missing/invalid credentials
     */
    isAuthError(): boolean;
}
