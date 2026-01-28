/**
 * HIPAA-Compliant Encryption Helpers
 * 
 * AES-256-GCM encryption for Protected Health Information (PHI).
 * 
 * Features:
 * - AES-256-GCM encryption (NIST approved, HIPAA compliant)
 * - Secure key derivation with PBKDF2
 * - Automatic IV generation
 * - Authentication tags to prevent tampering
 * - Field-level encryption for sensitive data
 * 
 * @see HIPAA Security Rule § 164.312(a)(2)(iv)
 * @see NIST SP 800-38D (GCM mode)
 */

import crypto from 'crypto';
import { logger } from '@/lib/logger';

// =============================================================================
// CONFIGURATION
// =============================================================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 32; // 256 bits

// Get master key from environment (MUST be set in production)
function getMasterKey(): string {
    const key = process.env.HIPAA_ENCRYPTION_KEY;
    if (!key) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('HIPAA_ENCRYPTION_KEY not set in production environment');
        }
        // Dev fallback (DO NOT USE IN PRODUCTION)
        return 'dev-only-key-not-for-production-32bytes!';
    }
    return key;
}

// =============================================================================
// TYPES
// =============================================================================

interface EncryptedData {
    ciphertext: string;
    iv: string;
    authTag: string;
    salt: string;
    version: number;
}

interface DecryptedField<T = string> {
    value: T;
    decryptedAt: Date;
}

// Sensitive PHI field types that require encryption
type PHIFieldType =
    | 'SSN'           // Social Security Number
    | 'DOB'           // Date of Birth
    | 'MEDICAL_RECORD_NUMBER'
    | 'DIAGNOSIS'
    | 'MEDICATION'
    | 'LAB_RESULT'
    | 'CLINICAL_NOTE'
    | 'INSURANCE_ID'
    | 'CONTACT_INFO'
    | 'FINANCIAL';

// =============================================================================
// CORE ENCRYPTION FUNCTIONS
// =============================================================================

/**
 * Derive a key from master key using PBKDF2
 */
function deriveKey(masterKey: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(masterKey, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt sensitive data using AES-256-GCM
 */
export function encrypt(plaintext: string): EncryptedData {
    try {
        const salt = crypto.randomBytes(SALT_LENGTH);
        const iv = crypto.randomBytes(IV_LENGTH);
        const key = deriveKey(getMasterKey(), salt);

        const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
            authTagLength: AUTH_TAG_LENGTH,
        });

        let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
        ciphertext += cipher.final('base64');

        const authTag = cipher.getAuthTag();

        return {
            ciphertext,
            iv: iv.toString('base64'),
            authTag: authTag.toString('base64'),
            salt: salt.toString('base64'),
            version: 1,
        };
    } catch (error) {
        logger.error({
            event: 'hipaa_encryption_failed',
            error: error instanceof Error ? error.message : 'Unknown',
        });
        throw new Error('Encryption failed');
    }
}

/**
 * Decrypt data encrypted with AES-256-GCM
 */
export function decrypt(encryptedData: EncryptedData): string {
    try {
        const salt = Buffer.from(encryptedData.salt, 'base64');
        const iv = Buffer.from(encryptedData.iv, 'base64');
        const authTag = Buffer.from(encryptedData.authTag, 'base64');
        const key = deriveKey(getMasterKey(), salt);

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
            authTagLength: AUTH_TAG_LENGTH,
        });
        decipher.setAuthTag(authTag);

        let plaintext = decipher.update(encryptedData.ciphertext, 'base64', 'utf8');
        plaintext += decipher.final('utf8');

        return plaintext;
    } catch (error) {
        logger.error({
            event: 'hipaa_decryption_failed',
            error: error instanceof Error ? error.message : 'Unknown',
        });
        throw new Error('Decryption failed - data may be tampered or key mismatch');
    }
}

// =============================================================================
// FIELD-LEVEL ENCRYPTION (for Prisma/ORM integration)
// =============================================================================

/**
 * Encrypt a PHI field for database storage
 */
export function encryptField(value: string, fieldType: PHIFieldType): string {
    const encrypted = encrypt(value);

    // Log encryption event (without the actual data)
    logger.info({
        event: 'phi_field_encrypted',
        fieldType,
        valueLength: value.length,
    });

    return JSON.stringify(encrypted);
}

/**
 * Decrypt a PHI field from database
 */
export function decryptField(encryptedJson: string): DecryptedField {
    const encrypted: EncryptedData = JSON.parse(encryptedJson);
    const value = decrypt(encrypted);

    return {
        value,
        decryptedAt: new Date(),
    };
}

/**
 * Check if a value is encrypted (JSON format check)
 */
export function isEncrypted(value: string): boolean {
    try {
        const parsed = JSON.parse(value);
        return (
            typeof parsed === 'object' &&
            'ciphertext' in parsed &&
            'iv' in parsed &&
            'authTag' in parsed &&
            'salt' in parsed
        );
    } catch {
        return false;
    }
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Encrypt multiple fields at once
 */
export function encryptFields(
    fields: Record<string, string>,
    fieldTypes: Record<string, PHIFieldType>
): Record<string, string> {
    const encrypted: Record<string, string> = {};

    for (const [key, value] of Object.entries(fields)) {
        if (value && fieldTypes[key]) {
            encrypted[key] = encryptField(value, fieldTypes[key]);
        } else {
            encrypted[key] = value;
        }
    }

    return encrypted;
}

/**
 * Decrypt multiple fields at once
 */
export function decryptFields(
    encryptedFields: Record<string, string>
): Record<string, string> {
    const decrypted: Record<string, string> = {};

    for (const [key, value] of Object.entries(encryptedFields)) {
        if (value && isEncrypted(value)) {
            decrypted[key] = decryptField(value).value;
        } else {
            decrypted[key] = value;
        }
    }

    return decrypted;
}

// =============================================================================
// SECURE COMPARISON (Timing attack safe)
// =============================================================================

/**
 * Compare two strings in constant time (prevents timing attacks)
 */
export function secureCompare(a: string, b: string): boolean {
    try {
        return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch {
        return false;
    }
}

// =============================================================================
// KEY ROTATION HELPERS
// =============================================================================

/**
 * Re-encrypt data with a new key (for key rotation)
 */
export function rotateEncryption(
    encryptedData: EncryptedData,
    oldKey: string,
    newKey: string
): EncryptedData {
    // Decrypt with old key
    const salt = Buffer.from(encryptedData.salt, 'base64');
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const authTag = Buffer.from(encryptedData.authTag, 'base64');
    const oldDerivedKey = deriveKey(oldKey, salt);

    const decipher = crypto.createDecipheriv(ALGORITHM, oldDerivedKey, iv, {
        authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    let plaintext = decipher.update(encryptedData.ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');

    // Re-encrypt with new key
    const newSalt = crypto.randomBytes(SALT_LENGTH);
    const newIv = crypto.randomBytes(IV_LENGTH);
    const newDerivedKey = deriveKey(newKey, newSalt);

    const cipher = crypto.createCipheriv(ALGORITHM, newDerivedKey, newIv, {
        authTagLength: AUTH_TAG_LENGTH,
    });

    let newCiphertext = cipher.update(plaintext, 'utf8', 'base64');
    newCiphertext += cipher.final('base64');

    return {
        ciphertext: newCiphertext,
        iv: newIv.toString('base64'),
        authTag: cipher.getAuthTag().toString('base64'),
        salt: newSalt.toString('base64'),
        version: encryptedData.version + 1,
    };
}

// =============================================================================
// HASH FUNCTIONS (for searchable encrypted fields)
// =============================================================================

/**
 * Generate a deterministic hash for searchable encrypted fields
 * (e.g., search by SSN without decrypting all records)
 */
export function hashForSearch(value: string, fieldType: PHIFieldType): string {
    const salt = `${getMasterKey()}:${fieldType}:searchable`;
    return crypto
        .createHmac('sha256', salt)
        .update(value)
        .digest('hex');
}

// =============================================================================
// EXPORTS
// =============================================================================

export const hipaaEncryption = {
    encrypt,
    decrypt,
    encryptField,
    decryptField,
    isEncrypted,
    encryptFields,
    decryptFields,
    secureCompare,
    rotateEncryption,
    hashForSearch,
};
