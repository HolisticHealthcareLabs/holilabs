/**
 * Encryption Utilities for Sensitive Data
 * AES-256-GCM encryption for API keys and secrets
 *
 * SECURITY: Used for encrypting sensitive data at rest in database
 */
export interface EncryptedData {
    iv: string;
    encrypted: string;
    authTag: string;
}
/**
 * Encrypt data using AES-256-GCM
 * @param plaintext - Data to encrypt (will be JSON stringified)
 * @returns Encrypted data with IV and auth tag
 */
export declare function encrypt(plaintext: any): EncryptedData;
/**
 * Decrypt data using AES-256-GCM
 * @param encryptedData - Data to decrypt
 * @returns Decrypted plaintext (parsed as JSON if possible)
 */
export declare function decrypt(encryptedData: EncryptedData): any;
/**
 * Encrypt a string (for backwards compatibility)
 */
export declare function encryptString(plaintext: string): string;
/**
 * Decrypt a string (for backwards compatibility)
 */
export declare function decryptString(encryptedString: string): string;
/**
 * Generate a new encryption key
 * Use this to create ENCRYPTION_KEY for .env
 */
export declare function generateEncryptionKey(): string;
/**
 * Hash a value using SHA-256 (for data integrity checks)
 * Used for blockchain hashing
 */
export declare function hash(data: any): string;
/**
 * Compare two hashes in constant time (prevents timing attacks)
 */
export declare function compareHashes(hash1: string, hash2: string): boolean;
/**
 * Mask sensitive string (for display purposes)
 * Example: "sk-ant-api03-1234567890" -> "sk-ant-***7890"
 */
export declare function maskSensitiveString(value: string, showLast?: number): string;
/**
 * Encrypt PHI field (returns base64 string for easy storage)
 * Format: iv:authTag:encrypted (all base64)
 */
export declare function encryptPHI(plaintext: string | null): string | null;
/**
 * Decrypt PHI field
 * Expects format: iv:authTag:encryptedData (all base64)
 */
export declare function decryptPHI(ciphertext: string | null): string | null;
/**
 * Encrypt file buffer (for audio/documents)
 * Returns buffer with iv:authTag:encrypted
 */
export declare function encryptBuffer(buffer: Buffer): Buffer;
/**
 * Decrypt file buffer
 */
export declare function decryptBuffer(encryptedBuffer: Buffer): Buffer;
/**
 * Test encryption/decryption
 * Run: node -r ts-node/register src/lib/security/encryption.ts
 */
export declare function testEncryption(): void;
//# sourceMappingURL=encryption.d.ts.map