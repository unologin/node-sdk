/**
 * @module key-manager
 * @hidden
 */
import { IUnologinClient } from './types';
export interface PublicKey {
    data: string;
    createdAt: number;
    expiresIn: number;
}
/**
 * Handles fetching and caching of public keys.
 */
export default class KeyManager {
    private client;
    private loginTokenKey;
    /** */
    constructor(client: Pick<IUnologinClient, 'request'>);
    /**
     * Ensures that the key passed has the correct structure.
     * @param key key
     * @returns key if valid
     * @throws Error otherwise
     */
    checkLoginTokenKey(key: unknown): PublicKey;
    /**
     * @returns {Promise<PublicKey>} key for login token verification
     */
    getLoginTokenKey(): Promise<PublicKey>;
}
