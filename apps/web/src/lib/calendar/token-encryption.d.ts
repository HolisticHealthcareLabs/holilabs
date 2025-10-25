/**
 * Calendar Token Encryption
 * Encrypt/decrypt OAuth tokens before storing in database
 */
/**
 * Encrypt access token before storing in database
 */
export declare function encryptToken(token: string): string;
/**
 * Decrypt access token from database
 */
export declare function decryptToken(encryptedToken: string): string;
/**
 * Check if token is encrypted (has IV and authTag properties)
 */
export declare function isTokenEncrypted(token: string): boolean;
//# sourceMappingURL=token-encryption.d.ts.map