/**
 * Cloudflare R2 Storage Client
 *
 * S3-compatible object storage for patient documents
 */
/**
 * Upload encrypted file to R2
 *
 * @param key - Storage key (path in bucket)
 * @param buffer - File buffer (encrypted)
 * @param contentType - MIME type
 * @param metadata - Additional metadata
 * @returns Storage key
 */
export declare function uploadToR2(key: string, buffer: Buffer, contentType: string, metadata?: Record<string, string>): Promise<string>;
/**
 * Download encrypted file from R2
 *
 * @param key - Storage key
 * @returns File buffer (encrypted)
 */
export declare function downloadFromR2(key: string): Promise<Buffer>;
/**
 * Delete file from R2
 *
 * @param key - Storage key
 */
export declare function deleteFromR2(key: string): Promise<void>;
/**
 * Generate a pre-signed URL for temporary access (for downloads)
 *
 * @param key - Storage key
 * @param expiresIn - URL expiration in seconds (default 1 hour)
 * @returns Pre-signed URL
 */
export declare function generatePresignedUrl(key: string, expiresIn?: number): Promise<string>;
/**
 * Generate storage key for a patient document
 *
 * @param patientId - Patient ID
 * @param fileId - Unique file ID
 * @param extension - File extension
 * @returns Storage key
 */
export declare function generateStorageKey(patientId: string, fileId: string, extension: string): string;
//# sourceMappingURL=r2-client.d.ts.map