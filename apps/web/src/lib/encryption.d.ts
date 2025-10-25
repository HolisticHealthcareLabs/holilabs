/**
 * File Encryption Utilities
 *
 * AES-256-GCM encryption for HIPAA-compliant file storage
 */
/**
 * Encrypt a file buffer
 *
 * @param buffer - File buffer to encrypt
 * @returns Encrypted buffer with IV and auth tag prepended
 */
export declare function encryptFile(buffer: Buffer): Buffer;
/**
 * Decrypt a file buffer
 *
 * @param encryptedBuffer - Encrypted buffer with IV and auth tag prepended
 * @returns Decrypted buffer
 */
export declare function decryptFile(encryptedBuffer: Buffer): Buffer;
/**
 * Generate a secure hash of file content (for deduplication)
 *
 * @param buffer - File buffer
 * @returns SHA-256 hash hex string
 */
export declare function hashFile(buffer: Buffer): string;
/**
 * Generate a unique file ID
 */
export declare function generateFileId(): string;
/**
 * Sanitize filename for storage
 */
export declare function sanitizeFilename(filename: string): string;
/**
 * Get file extension
 */
export declare function getFileExtension(filename: string): string;
/**
 * Validate file type
 */
export declare function isAllowedFileType(filename: string): boolean;
/**
 * Validate file size
 */
export declare function isAllowedFileSize(sizeBytes: number, maxSizeMB?: number): boolean;
//# sourceMappingURL=encryption.d.ts.map