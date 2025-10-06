/**
 * Encryption Utilities for Sensitive Data
 * AES-256-GCM encryption for API keys and secrets
 *
 * SECURITY: Used for encrypting sensitive data at rest in database
 */

import crypto from 'crypto';

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
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY not set in environment. Generate with: openssl rand -hex 32'
    );
  }

  if (key.length !== 64) {
    // 32 bytes = 64 hex chars
    throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
  }

  return Buffer.from(key, 'hex');
}

// ============================================================================
// ENCRYPTION FUNCTIONS
// ============================================================================

export interface EncryptedData {
  iv: string; // Initialization vector (hex)
  encrypted: string; // Encrypted data (hex)
  authTag: string; // Authentication tag (hex)
}

/**
 * Encrypt data using AES-256-GCM
 * @param plaintext - Data to encrypt (will be JSON stringified)
 * @returns Encrypted data with IV and auth tag
 */
export function encrypt(plaintext: any): EncryptedData {
  try {
    const key = getEncryptionKey();

    // Generate random IV (must be unique for each encryption)
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Convert plaintext to JSON string
    const plaintextString =
      typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext);

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
  } catch (error: any) {
    console.error('Encryption error:', error.message);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data using AES-256-GCM
 * @param encryptedData - Data to decrypt
 * @returns Decrypted plaintext (parsed as JSON if possible)
 */
export function decrypt(encryptedData: EncryptedData): any {
  try {
    const key = getEncryptionKey();

    // Convert hex strings to buffers
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    // Try to parse as JSON
    try {
      return JSON.parse(decrypted);
    } catch {
      // Return as string if not valid JSON
      return decrypted;
    }
  } catch (error: any) {
    console.error('Decryption error:', error.message);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Encrypt a string (for backwards compatibility)
 */
export function encryptString(plaintext: string): string {
  const encrypted = encrypt(plaintext);
  return JSON.stringify(encrypted);
}

/**
 * Decrypt a string (for backwards compatibility)
 */
export function decryptString(encryptedString: string): string {
  const encrypted = JSON.parse(encryptedString) as EncryptedData;
  return decrypt(encrypted);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a new encryption key
 * Use this to create ENCRYPTION_KEY for .env
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a value using SHA-256 (for data integrity checks)
 * Used for blockchain hashing
 */
export function hash(data: any): string {
  const dataString = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(dataString).digest('hex');
}

/**
 * Compare two hashes in constant time (prevents timing attacks)
 */
export function compareHashes(hash1: string, hash2: string): boolean {
  if (hash1.length !== hash2.length) {
    return false;
  }

  const buf1 = Buffer.from(hash1);
  const buf2 = Buffer.from(hash2);

  return crypto.timingSafeEqual(buf1, buf2);
}

/**
 * Mask sensitive string (for display purposes)
 * Example: "sk-ant-api03-1234567890" -> "sk-ant-***7890"
 */
export function maskSensitiveString(value: string, showLast: number = 4): string {
  if (!value || value.length < 8) {
    return '';
  }

  const prefix = value.slice(0, 7);
  const suffix = value.slice(-showLast);
  return `${prefix}***${suffix}`;
}

// ============================================================================
// TESTING
// ============================================================================

/**
 * Test encryption/decryption
 * Run: node -r ts-node/register src/lib/security/encryption.ts
 */
export function testEncryption() {
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
  console.log(
    '✅ Test 2 - Object:',
    JSON.stringify(testObject) === JSON.stringify(decrypted2) ? 'PASS' : 'FAIL'
  );

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
