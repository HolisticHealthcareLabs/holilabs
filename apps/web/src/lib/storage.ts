/**
 * File Storage Utility
 *
 * Simple, secure file upload to Cloudflare R2 (S3-compatible)
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

// Initialize S3 client for Cloudflare R2
const getS3Client = () => {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 credentials not configured');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
};

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'holi-labs-files';

// Allowed file types
const ALLOWED_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/plain': '.txt',
  'audio/webm': '.webm',
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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
export async function uploadFile(options: UploadOptions): Promise<UploadResult> {
  const { file, filename, contentType, folder = 'documents', metadata = {} } = options;

  // Validate file type
  if (!ALLOWED_TYPES[contentType as keyof typeof ALLOWED_TYPES]) {
    throw new Error(`File type not allowed: ${contentType}`);
  }

  // Validate file size
  if (file.length > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum (${MAX_FILE_SIZE / 1024 / 1024}MB)`);
  }

  // Generate unique filename
  const extension = ALLOWED_TYPES[contentType as keyof typeof ALLOWED_TYPES];
  const hash = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  const key = `${folder}/${timestamp}-${hash}${extension}`;

  // Upload to R2
  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType,
    Metadata: {
      originalName: filename,
      ...metadata,
    },
  });

  await client.send(command);

  // Generate public URL (if R2 public access is enabled)
  // Or use presigned URL for private access
  const publicUrl = process.env.R2_PUBLIC_URL
    ? `${process.env.R2_PUBLIC_URL}/${key}`
    : await getFileUrl(key);

  return {
    key,
    url: publicUrl,
    size: file.length,
    contentType,
  };
}

/**
 * Get presigned URL for private file access
 */
export async function getFileUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Delete file from R2
 */
export async function deleteFile(key: string): Promise<void> {
  const client = getS3Client();
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await client.send(command);
}

/**
 * Validate file before upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!ALLOWED_TYPES[file.type as keyof typeof ALLOWED_TYPES]) {
    return {
      valid: false,
      error: `Tipo de archivo no permitido: ${file.type}`,
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Archivo demasiado grande (máximo ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
    };
  }

  return { valid: true };
}

/**
 * Get file extension from content type
 */
export function getFileExtension(contentType: string): string {
  return ALLOWED_TYPES[contentType as keyof typeof ALLOWED_TYPES] || '';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
