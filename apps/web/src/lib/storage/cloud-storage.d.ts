/**
 * Encrypted Cloud Storage Utility
 *
 * Handles file uploads to S3/Cloudflare R2 with encryption
 * HIPAA-compliant encrypted storage for PHI
 */
export interface FileUploadResult {
    fileName: string;
    originalName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    encrypted: boolean;
    thumbnailUrl?: string;
    metadata: {
        uploadedBy: string;
        uploadedAt: string;
        encrypted: boolean;
        contentType: string;
    };
}
export interface FileUploadOptions {
    userId: string;
    userType: 'clinician' | 'patient';
    maxSize?: number;
    allowedTypes?: string[];
    generateThumbnail?: boolean;
    encrypt?: boolean;
}
/**
 * Upload file to S3/R2 with encryption
 */
export declare function uploadEncryptedFile(file: Express.Multer.File, options: FileUploadOptions): Promise<FileUploadResult>;
/**
 * Download and decrypt file from S3/R2
 */
export declare function downloadEncryptedFile(fileName: string): Promise<Buffer>;
/**
 * Delete file from S3/R2
 */
export declare function deleteFile(fileName: string): Promise<void>;
/**
 * Get signed URL for temporary access (without downloading entire file)
 */
export declare function getSignedFileUrl(fileName: string, expiresIn?: number): Promise<string>;
//# sourceMappingURL=cloud-storage.d.ts.map