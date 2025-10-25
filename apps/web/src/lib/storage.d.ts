/**
 * File Storage Utility
 *
 * Simple, secure file upload to Cloudflare R2 (S3-compatible)
 */
export interface UploadOptions {
    file: Buffer;
    filename: string;
    contentType: string;
    folder?: string;
    metadata?: Record<string, string>;
}
export interface UploadResult {
    key: string;
    url: string;
    size: number;
    contentType: string;
}
/**
 * Upload file to R2 storage
 */
export declare function uploadFile(options: UploadOptions): Promise<UploadResult>;
/**
 * Get presigned URL for private file access
 */
export declare function getFileUrl(key: string, expiresIn?: number): Promise<string>;
/**
 * Delete file from R2
 */
export declare function deleteFile(key: string): Promise<void>;
/**
 * Validate file before upload
 */
export declare function validateFile(file: File): {
    valid: boolean;
    error?: string;
};
/**
 * Get file extension from content type
 */
export declare function getFileExtension(contentType: string): string;
/**
 * Format file size for display
 */
export declare function formatFileSize(bytes: number): string;
//# sourceMappingURL=storage.d.ts.map