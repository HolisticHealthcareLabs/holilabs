/**
 * Encrypted Cloud Storage Utility
 *
 * Handles file uploads to S3/Cloudflare R2 with encryption
 * HIPAA-compliant encrypted storage for PHI
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import sharp from 'sharp';
import logger from '../logger';

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
  encrypt?: boolean; // Always encrypt PHI by default
}

/**
 * Initialize S3/R2 client
 */
function getS3Client(): S3Client {
  if (!STORAGE_CONFIG.accessKeyId || !STORAGE_CONFIG.secretAccessKey) {
    throw new Error('S3/R2 credentials not configured');
  }

  return new S3Client({
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
function deriveKey(masterKey: string, salt: Buffer): Buffer {
  const crypto = require('crypto');
  return crypto.pbkdf2Sync(masterKey, salt, 100000, ENCRYPTION_CONFIG.keyLength, 'sha256');
}

/**
 * Encrypt file buffer
 */
function encryptBuffer(buffer: Buffer): {
  encrypted: Buffer;
  iv: Buffer;
  salt: Buffer;
  authTag: Buffer;
} {
  // Generate random salt and IV
  const salt = randomBytes(ENCRYPTION_CONFIG.saltLength);
  const iv = randomBytes(ENCRYPTION_CONFIG.ivLength);

  // Derive encryption key from master key + salt
  const key = deriveKey(ENCRYPTION_CONFIG.masterKey, salt);

  // Create cipher
  const cipher = createCipheriv(ENCRYPTION_CONFIG.algorithm, key, iv);

  // Encrypt
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);

  // Get authentication tag (for GCM mode integrity)
  const authTag = cipher.getAuthTag();

  return { encrypted, iv, salt, authTag };
}

/**
 * Decrypt file buffer
 */
function decryptBuffer(
  encrypted: Buffer,
  iv: Buffer,
  salt: Buffer,
  authTag: Buffer
): Buffer {
  // Derive decryption key from master key + salt
  const key = deriveKey(ENCRYPTION_CONFIG.masterKey, salt);

  // Create decipher
  const decipher = createDecipheriv(ENCRYPTION_CONFIG.algorithm, key, iv);
  decipher.setAuthTag(authTag);

  // Decrypt
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

/**
 * Generate unique filename
 */
function generateFileName(originalName: string): string {
  const ext = path.extname(originalName);
  const random = randomBytes(16).toString('hex');
  const timestamp = Date.now();
  return `${timestamp}-${random}${ext}`;
}

/**
 * Validate file
 */
function validateFile(file: Express.Multer.File, options: FileUploadOptions): void {
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

  logger.info({
    event: 'file_validated',
    fileName: file.originalname,
    fileSize: file.size,
    fileType: file.mimetype,
  });
}

/**
 * Upload file to S3/R2 with encryption
 */
export async function uploadEncryptedFile(
  file: Express.Multer.File,
  options: FileUploadOptions
): Promise<FileUploadResult> {
  const path = require('path');

  try {
    // Validate file
    validateFile(file, options);

    const fileName = generateFileName(file.originalname);
    const shouldEncrypt = options.encrypt !== false; // Encrypt by default

    let finalBuffer = file.buffer;
    let metadata: any = {
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

      logger.info({
        event: 'file_encrypted',
        fileName,
        originalSize: file.size,
        encryptedSize: finalBuffer.length,
      });
    }

    // Upload to S3/R2
    const s3Client = getS3Client();

    await s3Client.send(
      new PutObjectCommand({
        Bucket: STORAGE_CONFIG.bucket,
        Key: fileName,
        Body: finalBuffer,
        ContentType: file.mimetype,
        Metadata: metadata,
        ServerSideEncryption: 'AES256', // S3 server-side encryption (additional layer)
      })
    );

    logger.info({
      event: 'file_uploaded_to_cloud',
      fileName,
      fileSize: finalBuffer.length,
      bucket: STORAGE_CONFIG.bucket,
      encrypted: shouldEncrypt,
    });

    // Generate file URL
    const fileUrl = STORAGE_CONFIG.publicUrl
      ? `${STORAGE_CONFIG.publicUrl}/${fileName}`
      : await getSignedUrl(
          s3Client,
          new GetObjectCommand({
            Bucket: STORAGE_CONFIG.bucket,
            Key: fileName,
          }),
          { expiresIn: 3600 } // 1 hour
        );

    // Generate thumbnail for images
    let thumbnailUrl: string | undefined;
    if (options.generateThumbnail && ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      try {
        thumbnailUrl = await generateAndUploadThumbnail(file.buffer, fileName, s3Client);
      } catch (thumbnailError) {
        logger.error({
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
  } catch (error) {
    logger.error({
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
async function generateAndUploadThumbnail(
  originalBuffer: Buffer,
  originalFileName: string,
  s3Client: S3Client
): Promise<string> {
  const thumbnailFileName = `thumb-${originalFileName}`;

  // Generate thumbnail (300x300)
  const thumbnailBuffer = await sharp(originalBuffer)
    .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  // Upload thumbnail (thumbnails don't need encryption)
  await s3Client.send(
    new PutObjectCommand({
      Bucket: STORAGE_CONFIG.bucket,
      Key: thumbnailFileName,
      Body: thumbnailBuffer,
      ContentType: 'image/jpeg',
      ServerSideEncryption: 'AES256',
    })
  );

  logger.info({
    event: 'thumbnail_uploaded',
    thumbnailFileName,
    thumbnailSize: thumbnailBuffer.length,
  });

  return STORAGE_CONFIG.publicUrl
    ? `${STORAGE_CONFIG.publicUrl}/${thumbnailFileName}`
    : await getSignedUrl(
        s3Client,
        new GetObjectCommand({
          Bucket: STORAGE_CONFIG.bucket,
          Key: thumbnailFileName,
        }),
        { expiresIn: 3600 }
      );
}

/**
 * Download and decrypt file from S3/R2
 */
export async function downloadEncryptedFile(fileName: string): Promise<Buffer> {
  try {
    const s3Client = getS3Client();

    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: STORAGE_CONFIG.bucket,
        Key: fileName,
      })
    );

    if (!response.Body) {
      throw new Error('File not found');
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
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

    logger.info({
      event: 'file_decrypted',
      fileName,
      encryptedSize: encryptedBuffer.length,
      decryptedSize: decrypted.length,
    });

    return decrypted;
  } catch (error) {
    logger.error({
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
export async function deleteFile(fileName: string): Promise<void> {
  try {
    const s3Client = getS3Client();

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: STORAGE_CONFIG.bucket,
        Key: fileName,
      })
    );

    // Also delete thumbnail if exists
    const thumbnailFileName = `thumb-${fileName}`;
    try {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: STORAGE_CONFIG.bucket,
          Key: thumbnailFileName,
        })
      );
    } catch (thumbnailError) {
      // Thumbnail might not exist, ignore error
    }

    logger.info({
      event: 'file_deleted',
      fileName,
    });
  } catch (error) {
    logger.error({
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
export async function getSignedFileUrl(fileName: string, expiresIn: number = 3600): Promise<string> {
  try {
    const s3Client = getS3Client();

    const url = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: STORAGE_CONFIG.bucket,
        Key: fileName,
      }),
      { expiresIn }
    );

    logger.info({
      event: 'signed_url_generated',
      fileName,
      expiresIn,
    });

    return url;
  } catch (error) {
    logger.error({
      event: 'signed_url_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      fileName,
    });
    throw error;
  }
}
