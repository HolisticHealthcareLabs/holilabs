/**
 * Encryption Utilities for Sensitive Data
 * AES-256-GCM encryption for API keys and secrets
 *
 * SECURITY: Used for encrypting sensitive data at rest in database
 * SOC 2 Control: CC6.7 (Data Encryption), CC6.8 (Key Management)
 *
 * Key Versioning Support:
 * - Supports multiple key versions for rotation (blue-green deployment)
 * - Current key (v1) encrypts new data
 * - Previous key (v0) decrypts old data during rotation window
 * - Format: v{version}:iv:authTag:encrypted
 */

import crypto from 'crypto';
import { getEncryptionKey as getEncryptionKeyFromAWS } from '@/lib/secrets/aws-secrets';
import { logger } from '@/lib/logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64;

// Key version management
let currentKeyVersion = 1;
const keyCache: Map<number, Buffer> = new Map();

/**
 * Set the current encryption key version
 * Called during application startup or key rotation
 */
export function setCurrentKeyVersion(version: number): void {
  currentKeyVersion = version;
  logger.info({ version }, 'Set current encryption key version');
}

/**
 * Get current key version
 */
export function getCurrentKeyVersion(): number {
  return currentKeyVersion;
}

/**
 * Load encryption key for a specific version
 * Keys are cached in memory for performance
 *
 * @param version - Key version (default: current version)
 * @returns Encryption key buffer
 */
async function loadEncryptionKeyForVersion(version: number): Promise<Buffer> {
  // Check cache first
  if (keyCache.has(version)) {
    return keyCache.get(version)!;
  }

  try {
    // In production, fetch from AWS Secrets Manager
    if (process.env.NODE_ENV === 'production' && process.env.USE_AWS_SECRETS === 'true') {
      const versionStage = version === currentKeyVersion ? 'current' : 'previous';
      const { key } = await getEncryptionKeyFromAWS(versionStage);

      if (key.length !== 64) {
        throw new Error(`Encryption key v${version} must be 32 bytes (64 hex characters)`);
      }

      const keyBuffer = Buffer.from(key, 'hex');
      keyCache.set(version, keyBuffer);

      logger.info({ version }, 'Loaded encryption key from AWS Secrets Manager');
      return keyBuffer;
    }

    // Fallback to environment variables (development)
    const envKey = version === currentKeyVersion
      ? process.env.ENCRYPTION_KEY
      : process.env.ENCRYPTION_KEY_PREVIOUS;

    if (!envKey) {
      throw new Error(
        `ENCRYPTION_KEY (v${version}) not found. Set USE_AWS_SECRETS=true for production or add to .env for development`
      );
    }

    if (envKey.length !== 64) {
      throw new Error(`Encryption key v${version} must be 32 bytes (64 hex characters)`);
    }

    const keyBuffer = Buffer.from(envKey, 'hex');
    keyCache.set(version, keyBuffer);

    return keyBuffer;
  } catch (error) {
    logger.error({ error, version }, 'Failed to load encryption key');
    throw new Error(`Failed to load encryption key v${version}: ${(error as Error).message}`);
  }
}

/**
 * Get encryption key from environment (legacy support)
 * Key must be 32 bytes (256 bits) in hex format
 *
 * @deprecated Use loadEncryptionKeyForVersion for key versioning support
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

/**
 * Clear key cache (call after key rotation)
 */
export function clearKeyCache(): void {
  keyCache.clear();
  logger.info('Encryption key cache cleared');
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
// PHI FIELD ENCRYPTION (Simple format for database fields)
// ============================================================================

/**
 * Encrypt PHI field with key versioning support
 * Format: v{version}:iv:authTag:encrypted (all base64)
 *
 * @param plaintext - PHI data to encrypt
 * @param keyVersion - Optional key version (default: current version)
 * @returns Encrypted string with version prefix
 *
 * @example
 * ```typescript
 * const encrypted = await encryptPHIWithVersion('John Doe');
 * // Returns: "v1:abc123==:def456==:ghi789=="
 * ```
 */
export async function encryptPHIWithVersion(
  plaintext: string | null,
  keyVersion?: number
): Promise<string | null> {
  if (!plaintext) return plaintext;

  try {
    const version = keyVersion || currentKeyVersion;
    const key = await loadEncryptionKeyForVersion(version);

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Format: v{version}:iv:authTag:encryptedData
    return `v${version}:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  } catch (error: any) {
    logger.error({ error }, 'PHI encryption error');
    throw new Error('Failed to encrypt PHI');
  }
}

/**
 * Decrypt PHI field with automatic key version detection
 * Supports legacy format (no version prefix) and versioned format (v{n}:...)
 *
 * @param ciphertext - Encrypted PHI data
 * @returns Decrypted plaintext
 *
 * @example
 * ```typescript
 * // Versioned format
 * const decrypted = await decryptPHIWithVersion('v1:abc123==:def456==:ghi789==');
 *
 * // Legacy format (no version)
 * const decrypted = await decryptPHIWithVersion('abc123==:def456==:ghi789==');
 * ```
 */
export async function decryptPHIWithVersion(ciphertext: string | null): Promise<string | null> {
  if (!ciphertext) return ciphertext;

  // If doesn't contain colons, assume it's not encrypted (plaintext migration data)
  if (!ciphertext.includes(':')) {
    logger.warn({ ciphertext: ciphertext.substring(0, 10) }, 'PHI appears to be unencrypted');
    return ciphertext;
  }

  try {
    const parts = ciphertext.split(':');

    // Determine if versioned format (v{n}:iv:authTag:data) or legacy (iv:authTag:data)
    let version = currentKeyVersion;
    let ivBase64: string;
    let authTagBase64: string;
    let encryptedData: string;

    if (parts[0].startsWith('v')) {
      // Versioned format: v{n}:iv:authTag:data
      if (parts.length !== 4) {
        throw new Error(`Invalid versioned PHI format: expected 4 parts, got ${parts.length}`);
      }

      version = parseInt(parts[0].substring(1), 10);
      ivBase64 = parts[1];
      authTagBase64 = parts[2];
      encryptedData = parts[3];
    } else {
      // Legacy format: iv:authTag:data (assume current version)
      if (parts.length !== 3) {
        throw new Error(`Invalid legacy PHI format: expected 3 parts, got ${parts.length}`);
      }

      ivBase64 = parts[0];
      authTagBase64 = parts[1];
      encryptedData = parts[2];

      logger.debug('Decrypting legacy PHI format (no version)');
    }

    // Load appropriate key version
    const key = await loadEncryptionKeyForVersion(version);

    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error: any) {
    logger.error({ error, ciphertext: ciphertext.substring(0, 20) }, 'PHI decryption error');
    throw new Error('Failed to decrypt PHI');
  }
}

/**
 * Encrypt PHI field (legacy synchronous version - backward compatibility)
 * Format: iv:authTag:encrypted (all base64)
 *
 * @deprecated Use encryptPHIWithVersion for key versioning support
 */
export function encryptPHI(plaintext: string | null): string | null {
  if (!plaintext) return plaintext;

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encryptedData (legacy format without version)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  } catch (error: any) {
    console.error('PHI encryption error:', error.message);
    throw new Error('Failed to encrypt PHI');
  }
}

/**
 * Decrypt PHI field (legacy synchronous version - backward compatibility)
 * Expects format: iv:authTag:encryptedData (all base64)
 *
 * @deprecated Use decryptPHIWithVersion for key versioning support
 */
export function decryptPHI(ciphertext: string | null): string | null {
  if (!ciphertext) return ciphertext;

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

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error: any) {
    console.error('PHI decryption error:', error.message);
    throw new Error('Failed to decrypt PHI');
  }
}

/**
 * Encrypt file buffer (for audio/documents)
 * Returns buffer with iv:authTag:encrypted
 */
export function encryptBuffer(buffer: Buffer): Buffer {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(buffer),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    // Format: iv (16 bytes) + authTag (16 bytes) + encrypted data
    return Buffer.concat([iv, authTag, encrypted]);
  } catch (error: any) {
    console.error('Buffer encryption error:', error.message);
    throw new Error('Failed to encrypt buffer');
  }
}

/**
 * Decrypt file buffer
 */
export function decryptBuffer(encryptedBuffer: Buffer): Buffer {
  try {
    const key = getEncryptionKey();

    const iv = encryptedBuffer.subarray(0, IV_LENGTH);
    const authTag = encryptedBuffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = encryptedBuffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
  } catch (error: any) {
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
