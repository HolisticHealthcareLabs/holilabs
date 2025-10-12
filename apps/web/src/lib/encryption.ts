/**
 * File Encryption Utilities
 *
 * AES-256-GCM encryption for HIPAA-compliant file storage
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64;

/**
 * Get encryption key from environment
 * In production, use a proper key management service (AWS KMS, Azure Key Vault, etc.)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.FILE_ENCRYPTION_KEY;

  if (!key) {
    throw new Error('FILE_ENCRYPTION_KEY environment variable not set');
  }

  // Derive 256-bit key from environment variable
  return crypto.scryptSync(key, 'salt', 32);
}

/**
 * Encrypt a file buffer
 *
 * @param buffer - File buffer to encrypt
 * @returns Encrypted buffer with IV and auth tag prepended
 */
export function encryptFile(buffer: Buffer): Buffer {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Combine IV + Auth Tag + Encrypted Data
    return Buffer.concat([iv, authTag, encrypted]);
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt file');
  }
}

/**
 * Decrypt a file buffer
 *
 * @param encryptedBuffer - Encrypted buffer with IV and auth tag prepended
 * @returns Decrypted buffer
 */
export function decryptFile(encryptedBuffer: Buffer): Buffer {
  try {
    const key = getEncryptionKey();

    // Extract IV, Auth Tag, and encrypted data
    const iv = encryptedBuffer.subarray(0, IV_LENGTH);
    const authTag = encryptedBuffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = encryptedBuffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt file');
  }
}

/**
 * Generate a secure hash of file content (for deduplication)
 *
 * @param buffer - File buffer
 * @returns SHA-256 hash hex string
 */
export function hashFile(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Generate a unique file ID
 */
export function generateFileId(): string {
  return `file_${crypto.randomBytes(16).toString('hex')}`;
}

/**
 * Sanitize filename for storage
 */
export function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  const basename = filename.replace(/^.*[\\\/]/, '');

  // Remove dangerous characters
  return basename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Get file extension
 */
export function getFileExtension(filename: string): string {
  const match = filename.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : '';
}

/**
 * Validate file type
 */
export function isAllowedFileType(filename: string): boolean {
  const allowedExtensions = [
    'pdf',
    'jpg',
    'jpeg',
    'png',
    'gif',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'txt',
    'csv',
  ];

  const extension = getFileExtension(filename);
  return allowedExtensions.includes(extension);
}

/**
 * Validate file size
 */
export function isAllowedFileSize(sizeBytes: number, maxSizeMB: number = 50): boolean {
  return sizeBytes <= maxSizeMB * 1024 * 1024;
}
