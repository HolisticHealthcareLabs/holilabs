/**
 * Calendar Token Encryption
 * Encrypt/decrypt OAuth tokens before storing in database
 */

import { encrypt, decrypt, EncryptedData } from '@/lib/security/encryption';

/**
 * Encrypt access token before storing in database
 */
export function encryptToken(token: string): string {
  const encrypted = encrypt(token);
  return JSON.stringify(encrypted);
}

/**
 * Decrypt access token from database
 */
export function decryptToken(encryptedToken: string): string {
  try {
    const encrypted = JSON.parse(encryptedToken) as EncryptedData;
    return decrypt(encrypted);
  } catch (error) {
    // Fallback for legacy plaintext tokens (during migration)
    console.warn('Token decryption failed - may be plaintext legacy token');
    return encryptedToken;
  }
}

/**
 * Check if token is encrypted (has IV and authTag properties)
 */
export function isTokenEncrypted(token: string): boolean {
  try {
    const parsed = JSON.parse(token);
    return !!(parsed.iv && parsed.encrypted && parsed.authTag);
  } catch {
    return false;
  }
}
