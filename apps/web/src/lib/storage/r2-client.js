"use strict";
/**
 * Cloudflare R2 Storage Client
 *
 * S3-compatible object storage for patient documents
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToR2 = uploadToR2;
exports.downloadFromR2 = downloadFromR2;
exports.deleteFromR2 = deleteFromR2;
exports.generatePresignedUrl = generatePresignedUrl;
exports.generateStorageKey = generateStorageKey;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
// Initialize R2 client
const r2Client = new client_s3_1.S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});
const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'patient-documents';
/**
 * Upload encrypted file to R2
 *
 * @param key - Storage key (path in bucket)
 * @param buffer - File buffer (encrypted)
 * @param contentType - MIME type
 * @param metadata - Additional metadata
 * @returns Storage key
 */
async function uploadToR2(key, buffer, contentType, metadata) {
    try {
        const command = new client_s3_1.PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            Metadata: {
                ...metadata,
                encrypted: 'true',
                uploadedAt: new Date().toISOString(),
            },
        });
        await r2Client.send(command);
        return key;
    }
    catch (error) {
        console.error('R2 upload error:', error);
        throw new Error('Failed to upload file to storage');
    }
}
/**
 * Download encrypted file from R2
 *
 * @param key - Storage key
 * @returns File buffer (encrypted)
 */
async function downloadFromR2(key) {
    try {
        const command = new client_s3_1.GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });
        const response = await r2Client.send(command);
        if (!response.Body) {
            throw new Error('File not found');
        }
        // Convert stream to buffer
        const chunks = [];
        for await (const chunk of response.Body) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks);
    }
    catch (error) {
        console.error('R2 download error:', error);
        throw new Error('Failed to download file from storage');
    }
}
/**
 * Delete file from R2
 *
 * @param key - Storage key
 */
async function deleteFromR2(key) {
    try {
        const command = new client_s3_1.DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });
        await r2Client.send(command);
    }
    catch (error) {
        console.error('R2 delete error:', error);
        throw new Error('Failed to delete file from storage');
    }
}
/**
 * Generate a pre-signed URL for temporary access (for downloads)
 *
 * @param key - Storage key
 * @param expiresIn - URL expiration in seconds (default 1 hour)
 * @returns Pre-signed URL
 */
async function generatePresignedUrl(key, expiresIn = 3600) {
    try {
        const command = new client_s3_1.GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });
        const url = await (0, s3_request_presigner_1.getSignedUrl)(r2Client, command, { expiresIn });
        return url;
    }
    catch (error) {
        console.error('Pre-signed URL generation error:', error);
        throw new Error('Failed to generate download URL');
    }
}
/**
 * Generate storage key for a patient document
 *
 * @param patientId - Patient ID
 * @param fileId - Unique file ID
 * @param extension - File extension
 * @returns Storage key
 */
function generateStorageKey(patientId, fileId, extension) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    // Structure: patients/{patientId}/{year}/{month}/{fileId}.{ext}
    return `patients/${patientId}/${year}/${month}/${fileId}.${extension}`;
}
//# sourceMappingURL=r2-client.js.map