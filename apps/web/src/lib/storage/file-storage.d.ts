/**
 * File Storage Utility
 *
 * Handles file uploads with validation, compression, and secure storage
 * Supports local storage with option to use S3/cloud storage
 */
export interface FileUploadResult {
    fileName: string;
    originalName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    thumbnailUrl?: string;
}
export interface FileUploadOptions {
    userId: string;
    userType: 'clinician' | 'patient';
    maxSize?: number;
    allowedTypes?: string[];
    generateThumbnail?: boolean;
}
/**
 * Upload file
 */
export declare function uploadFile(file: Express.Multer.File, options: FileUploadOptions): Promise<FileUploadResult>;
/**
 * Delete file
 */
export declare function deleteFile(fileName: string): Promise<void>;
/**
 * Get file info
 */
export declare function getFileInfo(fileName: string): Promise<{
    fileName: string;
    fileSize: number;
    createdAt: Date;
    modifiedAt: Date;
}>;
/**
 * Check if file exists
 */
export declare function fileExists(fileName: string): Promise<boolean>;
//# sourceMappingURL=file-storage.d.ts.map