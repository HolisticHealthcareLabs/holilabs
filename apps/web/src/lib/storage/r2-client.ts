/**
 * Cloudflare R2 Storage Client
 *
 * S3-compatible object storage for patient documents
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize R2 client
const r2Client = new S3Client({
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
export async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string,
  metadata?: Record<string, string>
): Promise<string> {
  try {
    const command = new PutObjectCommand({
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
  } catch (error) {
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
export async function downloadFromR2(key: string): Promise<Buffer> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await r2Client.send(command);

    if (!response.Body) {
      throw new Error('File not found');
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  } catch (error) {
    console.error('R2 download error:', error);
    throw new Error('Failed to download file from storage');
  }
}

/**
 * Delete file from R2
 *
 * @param key - Storage key
 */
export async function deleteFromR2(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
  } catch (error) {
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
export async function generatePresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(r2Client, command, { expiresIn });
    return url;
  } catch (error) {
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
export function generateStorageKey(patientId: string, fileId: string, extension: string): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  // Structure: patients/{patientId}/{year}/{month}/{fileId}.{ext}
  return `patients/${patientId}/${year}/${month}/${fileId}.${extension}`;
}
