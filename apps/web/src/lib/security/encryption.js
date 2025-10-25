"use strict";
/**
 * Encryption Utilities for Sensitive Data
 * AES-256-GCM encryption for API keys and secrets
 *
 * SECURITY: Used for encrypting sensitive data at rest in database
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.encryptString = encryptString;
exports.decryptString = decryptString;
exports.generateEncryptionKey = generateEncryptionKey;
exports.hash = hash;
exports.compareHashes = compareHashes;
exports.maskSensitiveString = maskSensitiveString;
exports.encryptPHI = encryptPHI;
exports.decryptPHI = decryptPHI;
exports.encryptBuffer = encryptBuffer;
exports.decryptBuffer = decryptBuffer;
exports.testEncryption = testEncryption;
const crypto_1 = __importDefault(require("crypto"));
// ============================================================================
// CONFIGURATION
// ============================================================================
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64;
/**
 * Get encryption key from environment
 * Key must be 32 bytes (256 bits) in hex format
 */
function getEncryptionKey() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        throw new Error('ENCRYPTION_KEY not set in environment. Generate with: openssl rand -hex 32');
    }
    if (key.length !== 64) {
        // 32 bytes = 64 hex chars
        throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
    }
    return Buffer.from(key, 'hex');
}
/**
 * Encrypt data using AES-256-GCM
 * @param plaintext - Data to encrypt (will be JSON stringified)
 * @returns Encrypted data with IV and auth tag
 */
function encrypt(plaintext) {
    try {
        const key = getEncryptionKey();
        // Generate random IV (must be unique for each encryption)
        const iv = crypto_1.default.randomBytes(IV_LENGTH);
        // Create cipher
        const cipher = crypto_1.default.createCipheriv(ALGORITHM, key, iv);
        // Convert plaintext to JSON string
        const plaintextString = typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext);
        // Encrypt
        let encrypted = cipher.update(plaintextString, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        // Get authentication tag (ensures data integrity)
        const authTag = cipher.getAuthTag();
        return {
            iv: iv.toString('hex'),
            encrypted,
            authTag: authTag.toString('hex'),
        };
    }
    catch (error) {
        console.error('Encryption error:', error.message);
        throw new Error('Failed to encrypt data');
    }
}
/**
 * Decrypt data using AES-256-GCM
 * @param encryptedData - Data to decrypt
 * @returns Decrypted plaintext (parsed as JSON if possible)
 */
function decrypt(encryptedData) {
    try {
        const key = getEncryptionKey();
        // Convert hex strings to buffers
        const iv = Buffer.from(encryptedData.iv, 'hex');
        const authTag = Buffer.from(encryptedData.authTag, 'hex');
        // Create decipher
        const decipher = crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        // Decrypt
        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        // Try to parse as JSON
        try {
            return JSON.parse(decrypted);
        }
        catch {
            // Return as string if not valid JSON
            return decrypted;
        }
    }
    catch (error) {
        console.error('Decryption error:', error.message);
        throw new Error('Failed to decrypt data');
    }
}
/**
 * Encrypt a string (for backwards compatibility)
 */
function encryptString(plaintext) {
    const encrypted = encrypt(plaintext);
    return JSON.stringify(encrypted);
}
/**
 * Decrypt a string (for backwards compatibility)
 */
function decryptString(encryptedString) {
    const encrypted = JSON.parse(encryptedString);
    return decrypt(encrypted);
}
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Generate a new encryption key
 * Use this to create ENCRYPTION_KEY for .env
 */
function generateEncryptionKey() {
    return crypto_1.default.randomBytes(32).toString('hex');
}
/**
 * Hash a value using SHA-256 (for data integrity checks)
 * Used for blockchain hashing
 */
function hash(data) {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto_1.default.createHash('sha256').update(dataString).digest('hex');
}
/**
 * Compare two hashes in constant time (prevents timing attacks)
 */
function compareHashes(hash1, hash2) {
    if (hash1.length !== hash2.length) {
        return false;
    }
    const buf1 = Buffer.from(hash1);
    const buf2 = Buffer.from(hash2);
    return crypto_1.default.timingSafeEqual(buf1, buf2);
}
/**
 * Mask sensitive string (for display purposes)
 * Example: "sk-ant-api03-1234567890" -> "sk-ant-***7890"
 */
function maskSensitiveString(value, showLast = 4) {
    if (!value || value.length < 8) {
        return '';
    }
    const prefix = value.slice(0, 7);
    const suffix = value.slice(-showLast);
    return `${prefix}***${suffix}`;
}
// ============================================================================
// PHI FIELD ENCRYPTION (Simple format for database fields)
// ============================================================================
/**
 * Encrypt PHI field (returns base64 string for easy storage)
 * Format: iv:authTag:encrypted (all base64)
 */
function encryptPHI(plaintext) {
    if (!plaintext)
        return plaintext;
    try {
        const key = getEncryptionKey();
        const iv = crypto_1.default.randomBytes(IV_LENGTH);
        const cipher = crypto_1.default.createCipheriv(ALGORITHM, key, iv);
        let encrypted = cipher.update(plaintext, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        const authTag = cipher.getAuthTag();
        // Format: iv:authTag:encryptedData
        return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
    }
    catch (error) {
        console.error('PHI encryption error:', error.message);
        throw new Error('Failed to encrypt PHI');
    }
}
/**
 * Decrypt PHI field
 * Expects format: iv:authTag:encryptedData (all base64)
 */
function decryptPHI(ciphertext) {
    if (!ciphertext)
        return ciphertext;
    // If doesn't contain colons, assume it's not encrypted (legacy/migration data)
    if (!ciphertext.includes(':')) {
        return ciphertext;
    }
    try {
        const key = getEncryptionKey();
        const parts = ciphertext.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted PHI format');
        }
        const iv = Buffer.from(parts[0], 'base64');
        const authTag = Buffer.from(parts[1], 'base64');
        const encrypted = parts[2];
        const decipher = crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encrypted, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    catch (error) {
        console.error('PHI decryption error:', error.message);
        throw new Error('Failed to decrypt PHI');
    }
}
/**
 * Encrypt file buffer (for audio/documents)
 * Returns buffer with iv:authTag:encrypted
 */
function encryptBuffer(buffer) {
    try {
        const key = getEncryptionKey();
        const iv = crypto_1.default.randomBytes(IV_LENGTH);
        const cipher = crypto_1.default.createCipheriv(ALGORITHM, key, iv);
        const encrypted = Buffer.concat([
            cipher.update(buffer),
            cipher.final(),
        ]);
        const authTag = cipher.getAuthTag();
        // Format: iv (16 bytes) + authTag (16 bytes) + encrypted data
        return Buffer.concat([iv, authTag, encrypted]);
    }
    catch (error) {
        console.error('Buffer encryption error:', error.message);
        throw new Error('Failed to encrypt buffer');
    }
}
/**
 * Decrypt file buffer
 */
function decryptBuffer(encryptedBuffer) {
    try {
        const key = getEncryptionKey();
        const iv = encryptedBuffer.subarray(0, IV_LENGTH);
        const authTag = encryptedBuffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
        const encrypted = encryptedBuffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
        const decipher = crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        return Buffer.concat([
            decipher.update(encrypted),
            decipher.final(),
        ]);
    }
    catch (error) {
        console.error('Buffer decryption error:', error.message);
        throw new Error('Failed to decrypt buffer');
    }
}
// ============================================================================
// TESTING
// ============================================================================
/**
 * Test encryption/decryption
 * Run: node -r ts-node/register src/lib/security/encryption.ts
 */
function testEncryption() {
    console.log('🔒 Testing encryption...\n');
    // Test 1: Simple string
    const testString = 'Hello, World!';
    const encrypted1 = encrypt(testString);
    const decrypted1 = decrypt(encrypted1);
    console.log('✅ Test 1 - String:', testString === decrypted1 ? 'PASS' : 'FAIL');
    // Test 2: Object
    const testObject = {
        apiKey: 'sk-ant-api03-1234567890',
        secret: 'my-secret-token',
    };
    const encrypted2 = encrypt(testObject);
    const decrypted2 = decrypt(encrypted2);
    console.log('✅ Test 2 - Object:', JSON.stringify(testObject) === JSON.stringify(decrypted2) ? 'PASS' : 'FAIL');
    // Test 3: Generate key
    const newKey = generateEncryptionKey();
    console.log('✅ Test 3 - Generated key length:', newKey.length === 64 ? 'PASS' : 'FAIL');
    // Test 4: Hash
    const hash1 = hash('test data');
    const hash2 = hash('test data');
    const hash3 = hash('different data');
    console.log('✅ Test 4 - Hash consistency:', hash1 === hash2 ? 'PASS' : 'FAIL');
    console.log('✅ Test 5 - Hash uniqueness:', hash1 !== hash3 ? 'PASS' : 'FAIL');
    // Test 6: Mask
    const masked = maskSensitiveString('sk-ant-api03-1234567890');
    console.log('✅ Test 6 - Masking:', masked === 'sk-ant-***7890' ? 'PASS' : 'FAIL');
    console.log('\n🎉 All tests completed!\n');
    console.log('To generate a new key for .env:');
    console.log('Run: openssl rand -hex 32');
    console.log('Or use: generateEncryptionKey()');
}
// Run tests if executed directly
if (require.main === module) {
    // Set test key
    process.env.ENCRYPTION_KEY = generateEncryptionKey();
    testEncryption();
}
//# sourceMappingURL=encryption.js.map