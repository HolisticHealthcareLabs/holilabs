"use strict";
/**
 * Encrypted Cloud Storage Utility
 *
 * Handles file uploads to S3/Cloudflare R2 with encryption
 * HIPAA-compliant encrypted storage for PHI
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadEncryptedFile = uploadEncryptedFile;
exports.downloadEncryptedFile = downloadEncryptedFile;
exports.deleteFile = deleteFile;
exports.getSignedFileUrl = getSignedFileUrl;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const crypto_1 = require("crypto");
const path_1 = __importDefault(require("path"));
const sharp_1 = __importDefault(require("sharp"));
const logger_1 = __importDefault(require("../logger"));
// Storage configuration
const STORAGE_CONFIG = {
    // Use Cloudflare R2 or AWS S3
    endpoint: process.env.R2_ENDPOINT || process.env.S3_ENDPOINT,
    region: process.env.R2_REGION || process.env.AWS_REGION || 'auto',
    bucket: process.env.R2_BUCKET || process.env.S3_BUCKET || 'holi-labs-uploads',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
    publicUrl: process.env.R2_PUBLIC_URL || process.env.S3_PUBLIC_URL,
};
// Encryption configuration
const ENCRYPTION_CONFIG = {
    algorithm: 'aes-256-gcm',
    keyLength: 32, // 256 bits
    ivLength: 16, // 128 bits
    saltLength: 64, // 512 bits
    tagLength: 16, // 128 bits
    // Master key should be rotated regularly
    masterKey: process.env.ENCRYPTION_MASTER_KEY || process.env.NEXTAUTH_SECRET || 'fallback-key-change-in-production',
};
// File constraints
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const ALLOWED_MIME_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];
/**
 * Initialize S3/R2 client
 */
function getS3Client() {
    if (!STORAGE_CONFIG.accessKeyId || !STORAGE_CONFIG.secretAccessKey) {
        throw new Error('S3/R2 credentials not configured');
    }
    return new client_s3_1.S3Client({
        region: STORAGE_CONFIG.region,
        endpoint: STORAGE_CONFIG.endpoint,
        credentials: {
            accessKeyId: STORAGE_CONFIG.accessKeyId,
            secretAccessKey: STORAGE_CONFIG.secretAccessKey,
        },
    });
}
/**
 * Derive encryption key from master key using PBKDF2
 */
function deriveKey(masterKey, salt) {
    const crypto = require('crypto');
    return crypto.pbkdf2Sync(masterKey, salt, 100000, ENCRYPTION_CONFIG.keyLength, 'sha256');
}
/**
 * Encrypt file buffer
 */
function encryptBuffer(buffer) {
    // Generate random salt and IV
    const salt = (0, crypto_1.randomBytes)(ENCRYPTION_CONFIG.saltLength);
    const iv = (0, crypto_1.randomBytes)(ENCRYPTION_CONFIG.ivLength);
    // Derive encryption key from master key + salt
    const key = deriveKey(ENCRYPTION_CONFIG.masterKey, salt);
    // Create cipher (cast to CipherGCM for GCM mode)
    const cipher = (0, crypto_1.createCipheriv)(ENCRYPTION_CONFIG.algorithm, key, iv);
    // Encrypt
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    // Get authentication tag (for GCM mode integrity)
    const authTag = cipher.getAuthTag();
    return { encrypted, iv, salt, authTag };
}
/**
 * Decrypt file buffer
 */
function decryptBuffer(encrypted, iv, salt, authTag) {
    // Derive decryption key from master key + salt
    const key = deriveKey(ENCRYPTION_CONFIG.masterKey, salt);
    // Create decipher (cast to DecipherGCM for GCM mode)
    const decipher = (0, crypto_1.createDecipheriv)(ENCRYPTION_CONFIG.algorithm, key, iv);
    decipher.setAuthTag(authTag);
    // Decrypt
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}
/**
 * Generate unique filename
 */
function generateFileName(originalName) {
    const ext = path_1.default.extname(originalName);
    const random = (0, crypto_1.randomBytes)(16).toString('hex');
    const timestamp = Date.now();
    return `${timestamp}-${random}${ext}`;
}
/**
 * Validate file
 */
function validateFile(file, options) {
    const maxSize = options.maxSize || MAX_FILE_SIZE;
    const allowedTypes = options.allowedTypes || ALLOWED_MIME_TYPES;
    // Check file size
    if (file.size > maxSize) {
        throw new Error(`File too large. Maximum size: ${maxSize / 1024 / 1024}MB`);
    }
    // Check MIME type
    if (!allowedTypes.includes(file.mimetype)) {
        throw new Error(`File type not allowed: ${file.mimetype}`);
    }
    logger_1.default.info({
        event: 'file_validated',
        fileName: file.originalname,
        fileSize: file.size,
        fileType: file.mimetype,
    });
}
/**
 * Upload file to S3/R2 with encryption
 */
async function uploadEncryptedFile(file, options) {
    const path = require('path');
    try {
        // Validate file
        validateFile(file, options);
        const fileName = generateFileName(file.originalname);
        const shouldEncrypt = options.encrypt !== false; // Encrypt by default
        let finalBuffer = file.buffer;
        let metadata = {
            uploadedBy: options.userId,
            uploadedAt: new Date().toISOString(),
            contentType: file.mimetype,
            originalName: file.originalname,
            encrypted: shouldEncrypt,
        };
        // Encrypt file if needed
        if (shouldEncrypt) {
            const { encrypted, iv, salt, authTag } = encryptBuffer(file.buffer);
            finalBuffer = encrypted;
            // Store encryption metadata (needed for decryption)
            metadata = {
                ...metadata,
                iv: iv.toString('base64'),
                salt: salt.toString('base64'),
                authTag: authTag.toString('base64'),
            };
            logger_1.default.info({
                event: 'file_encrypted',
                fileName,
                originalSize: file.size,
                encryptedSize: finalBuffer.length,
            });
        }
        // Upload to S3/R2
        const s3Client = getS3Client();
        await s3Client.send(new client_s3_1.PutObjectCommand({
            Bucket: STORAGE_CONFIG.bucket,
            Key: fileName,
            Body: finalBuffer,
            ContentType: file.mimetype,
            Metadata: metadata,
            ServerSideEncryption: 'AES256', // S3 server-side encryption (additional layer)
        }));
        logger_1.default.info({
            event: 'file_uploaded_to_cloud',
            fileName,
            fileSize: finalBuffer.length,
            bucket: STORAGE_CONFIG.bucket,
            encrypted: shouldEncrypt,
        });
        // Generate file URL
        const fileUrl = STORAGE_CONFIG.publicUrl
            ? `${STORAGE_CONFIG.publicUrl}/${fileName}`
            : await (0, s3_request_presigner_1.getSignedUrl)(s3Client, new client_s3_1.GetObjectCommand({
                Bucket: STORAGE_CONFIG.bucket,
                Key: fileName,
            }), { expiresIn: 3600 } // 1 hour
            );
        // Generate thumbnail for images
        let thumbnailUrl;
        if (options.generateThumbnail && ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
            try {
                thumbnailUrl = await generateAndUploadThumbnail(file.buffer, fileName, s3Client);
            }
            catch (thumbnailError) {
                logger_1.default.error({
                    event: 'thumbnail_generation_failed',
                    error: thumbnailError instanceof Error ? thumbnailError.message : 'Unknown error',
                    fileName,
                });
                // Continue without thumbnail
            }
        }
        return {
            fileName,
            originalName: file.originalname,
            fileUrl,
            fileType: file.mimetype,
            fileSize: file.size,
            encrypted: shouldEncrypt,
            thumbnailUrl,
            metadata: {
                uploadedBy: options.userId,
                uploadedAt: metadata.uploadedAt,
                encrypted: shouldEncrypt,
                contentType: file.mimetype,
            },
        };
    }
    catch (error) {
        logger_1.default.error({
            event: 'file_upload_error',
            error: error instanceof Error ? error.message : 'Unknown error',
            fileName: file.originalname,
            userId: options.userId,
        });
        throw error;
    }
}
/**
 * Generate and upload thumbnail
 */
async function generateAndUploadThumbnail(originalBuffer, originalFileName, s3Client) {
    const thumbnailFileName = `thumb-${originalFileName}`;
    // Generate thumbnail (300x300)
    const thumbnailBuffer = await (0, sharp_1.default)(originalBuffer)
        .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
    // Upload thumbnail (thumbnails don't need encryption)
    await s3Client.send(new client_s3_1.PutObjectCommand({
        Bucket: STORAGE_CONFIG.bucket,
        Key: thumbnailFileName,
        Body: thumbnailBuffer,
        ContentType: 'image/jpeg',
        ServerSideEncryption: 'AES256',
    }));
    logger_1.default.info({
        event: 'thumbnail_uploaded',
        thumbnailFileName,
        thumbnailSize: thumbnailBuffer.length,
    });
    return STORAGE_CONFIG.publicUrl
        ? `${STORAGE_CONFIG.publicUrl}/${thumbnailFileName}`
        : await (0, s3_request_presigner_1.getSignedUrl)(s3Client, new client_s3_1.GetObjectCommand({
            Bucket: STORAGE_CONFIG.bucket,
            Key: thumbnailFileName,
        }), { expiresIn: 3600 });
}
/**
 * Download and decrypt file from S3/R2
 */
async function downloadEncryptedFile(fileName) {
    try {
        const s3Client = getS3Client();
        const response = await s3Client.send(new client_s3_1.GetObjectCommand({
            Bucket: STORAGE_CONFIG.bucket,
            Key: fileName,
        }));
        if (!response.Body) {
            throw new Error('File not found');
        }
        // Convert stream to buffer
        const chunks = [];
        for await (const chunk of response.Body) {
            chunks.push(chunk);
        }
        const encryptedBuffer = Buffer.concat(chunks);
        // Check if file is encrypted
        const metadata = response.Metadata || {};
        const isEncrypted = metadata.encrypted === 'true';
        if (!isEncrypted) {
            return encryptedBuffer;
        }
        // Decrypt file
        const iv = Buffer.from(metadata.iv || '', 'base64');
        const salt = Buffer.from(metadata.salt || '', 'base64');
        const authTag = Buffer.from(metadata.authTag || '', 'base64');
        const decrypted = decryptBuffer(encryptedBuffer, iv, salt, authTag);
        logger_1.default.info({
            event: 'file_decrypted',
            fileName,
            encryptedSize: encryptedBuffer.length,
            decryptedSize: decrypted.length,
        });
        return decrypted;
    }
    catch (error) {
        logger_1.default.error({
            event: 'file_download_error',
            error: error instanceof Error ? error.message : 'Unknown error',
            fileName,
        });
        throw error;
    }
}
/**
 * Delete file from S3/R2
 */
async function deleteFile(fileName) {
    try {
        const s3Client = getS3Client();
        await s3Client.send(new client_s3_1.DeleteObjectCommand({
            Bucket: STORAGE_CONFIG.bucket,
            Key: fileName,
        }));
        // Also delete thumbnail if exists
        const thumbnailFileName = `thumb-${fileName}`;
        try {
            await s3Client.send(new client_s3_1.DeleteObjectCommand({
                Bucket: STORAGE_CONFIG.bucket,
                Key: thumbnailFileName,
            }));
        }
        catch (thumbnailError) {
            // Thumbnail might not exist, ignore error
        }
        logger_1.default.info({
            event: 'file_deleted',
            fileName,
        });
    }
    catch (error) {
        logger_1.default.error({
            event: 'file_delete_error',
            error: error instanceof Error ? error.message : 'Unknown error',
            fileName,
        });
        throw error;
    }
}
/**
 * Get signed URL for temporary access (without downloading entire file)
 */
async function getSignedFileUrl(fileName, expiresIn = 3600) {
    try {
        const s3Client = getS3Client();
        const url = await (0, s3_request_presigner_1.getSignedUrl)(s3Client, new client_s3_1.GetObjectCommand({
            Bucket: STORAGE_CONFIG.bucket,
            Key: fileName,
        }), { expiresIn });
        logger_1.default.info({
            event: 'signed_url_generated',
            fileName,
            expiresIn,
        });
        return url;
    }
    catch (error) {
        logger_1.default.error({
            event: 'signed_url_error',
            error: error instanceof Error ? error.message : 'Unknown error',
            fileName,
        });
        throw error;
    }
}
//# sourceMappingURL=cloud-storage.js.map