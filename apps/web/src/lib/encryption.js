"use strict";
/**
 * File Encryption Utilities
 *
 * AES-256-GCM encryption for HIPAA-compliant file storage
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptFile = encryptFile;
exports.decryptFile = decryptFile;
exports.hashFile = hashFile;
exports.generateFileId = generateFileId;
exports.sanitizeFilename = sanitizeFilename;
exports.getFileExtension = getFileExtension;
exports.isAllowedFileType = isAllowedFileType;
exports.isAllowedFileSize = isAllowedFileSize;
const crypto_1 = __importDefault(require("crypto"));
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64;
/**
 * Get encryption key from environment
 * In production, use a proper key management service (AWS KMS, Azure Key Vault, etc.)
 */
function getEncryptionKey() {
    const key = process.env.FILE_ENCRYPTION_KEY;
    if (!key) {
        throw new Error('FILE_ENCRYPTION_KEY environment variable not set');
    }
    // Derive 256-bit key from environment variable
    return crypto_1.default.scryptSync(key, 'salt', 32);
}
/**
 * Encrypt a file buffer
 *
 * @param buffer - File buffer to encrypt
 * @returns Encrypted buffer with IV and auth tag prepended
 */
function encryptFile(buffer) {
    try {
        const key = getEncryptionKey();
        const iv = crypto_1.default.randomBytes(IV_LENGTH);
        const cipher = crypto_1.default.createCipheriv(ALGORITHM, key, iv);
        const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
        const authTag = cipher.getAuthTag();
        // Combine IV + Auth Tag + Encrypted Data
        return Buffer.concat([iv, authTag, encrypted]);
    }
    catch (error) {
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
function decryptFile(encryptedBuffer) {
    try {
        const key = getEncryptionKey();
        // Extract IV, Auth Tag, and encrypted data
        const iv = encryptedBuffer.subarray(0, IV_LENGTH);
        const authTag = encryptedBuffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
        const encrypted = encryptedBuffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
        const decipher = crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        return Buffer.concat([decipher.update(encrypted), decipher.final()]);
    }
    catch (error) {
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
function hashFile(buffer) {
    return crypto_1.default.createHash('sha256').update(buffer).digest('hex');
}
/**
 * Generate a unique file ID
 */
function generateFileId() {
    return `file_${crypto_1.default.randomBytes(16).toString('hex')}`;
}
/**
 * Sanitize filename for storage
 */
function sanitizeFilename(filename) {
    // Remove path traversal attempts
    const basename = filename.replace(/^.*[\\\/]/, '');
    // Remove dangerous characters
    return basename.replace(/[^a-zA-Z0-9._-]/g, '_');
}
/**
 * Get file extension
 */
function getFileExtension(filename) {
    const match = filename.match(/\.([^.]+)$/);
    return match ? match[1].toLowerCase() : '';
}
/**
 * Validate file type
 */
function isAllowedFileType(filename) {
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
function isAllowedFileSize(sizeBytes, maxSizeMB = 50) {
    return sizeBytes <= maxSizeMB * 1024 * 1024;
}
//# sourceMappingURL=encryption.js.map