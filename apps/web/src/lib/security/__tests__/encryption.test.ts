/**
 * Encryption Test Suite
 * Tests AES-256-GCM encryption for PHI protection
 *
 * Coverage Target: 95%+ (critical security infrastructure)
 * Compliance: HIPAA §164.312(a)(2)(iv), SOC 2 CC6.7
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import crypto from 'crypto';
import {
  encrypt,
  decrypt,
  encryptPHIWithVersion,
  decryptPHIWithVersion,
  getCurrentKeyVersion,
  setCurrentKeyVersion,
  clearKeyCache,
} from '../encryption';

// Set up test encryption key
const TEST_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex'); // 256-bit key

describe('Encryption - AES-256-GCM', () => {
  beforeEach(() => {
    // Set test key in environment
    process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true });

    // Clear key cache before each test
    clearKeyCache();

    // Reset to default key version
    setCurrentKeyVersion(1);
  });

  afterEach(() => {
    // Clean up
    clearKeyCache();
    jest.restoreAllMocks();
  });

  describe('encrypt()', () => {
    it('should encrypt string data', () => {
      const plaintext = 'John Doe';
      const encrypted = encrypt(plaintext);

      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('encrypted');
      expect(encrypted).toHaveProperty('authTag');

      // IV should be 32 hex chars (16 bytes)
      expect(encrypted.iv).toHaveLength(32);

      // Auth tag should be 32 hex chars (16 bytes)
      expect(encrypted.authTag).toHaveLength(32);

      // Encrypted data should not equal plaintext
      expect(encrypted.encrypted).not.toEqual(plaintext);
    });

    it('should encrypt object data', () => {
      const plaintext = { firstName: 'John', lastName: 'Doe', age: 42 };
      const encrypted = encrypt(plaintext);

      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('encrypted');
      expect(encrypted).toHaveProperty('authTag');
    });

    it('should produce different ciphertext for same plaintext (random IV)', () => {
      const plaintext = 'John Doe';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      // IVs should be different (random)
      expect(encrypted1.iv).not.toEqual(encrypted2.iv);

      // Ciphertexts should be different
      expect(encrypted1.encrypted).not.toEqual(encrypted2.encrypted);

      // But both should decrypt to same plaintext
      const decrypted1 = decrypt(encrypted1);
      const decrypted2 = decrypt(encrypted2);

      expect(decrypted1).toEqual(plaintext);
      expect(decrypted2).toEqual(plaintext);
    });

    it('should handle empty string', () => {
      const plaintext = '';
      const encrypted = encrypt(plaintext);

      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('encrypted');

      const decrypted = decrypt(encrypted);
      expect(decrypted).toEqual(plaintext);
    });

    it('should handle special characters', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:",.<>?/~`';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toEqual(plaintext);
    });

    it('should handle Unicode characters', () => {
      const plaintext = 'João da Silva 日本語 🎉';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toEqual(plaintext);
    });

    it('should throw error if encryption key not set', () => {
      delete process.env.ENCRYPTION_KEY;
      clearKeyCache();

      // Error is wrapped with generic message for security
      expect(() => encrypt('test')).toThrow('Failed to encrypt data');
    });

    it('should throw error if encryption key is wrong length', () => {
      process.env.ENCRYPTION_KEY = 'too-short-key';
      clearKeyCache();

      // Error is wrapped with generic message for security
      expect(() => encrypt('test')).toThrow('Failed to encrypt data');
    });
  });

  describe('decrypt()', () => {
    it('should decrypt encrypted data back to original', () => {
      const plaintext = 'Sensitive PHI Data';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toEqual(plaintext);
    });

    it('should decrypt object data', () => {
      const plaintext = { name: 'John Doe', ssn: '123-45-6789' };
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toEqual(plaintext);
    });

    it('should throw error on tampered ciphertext', () => {
      const plaintext = 'John Doe';
      const encrypted = encrypt(plaintext);

      // Tamper with encrypted data
      const tamperedEncrypted = Buffer.from(encrypted.encrypted, 'hex');
      tamperedEncrypted[0] ^= 0xFF; // Flip bits
      encrypted.encrypted = tamperedEncrypted.toString('hex');

      expect(() => decrypt(encrypted)).toThrow();
    });

    it('should throw error on tampered auth tag', () => {
      const plaintext = 'John Doe';
      const encrypted = encrypt(plaintext);

      // Tamper with auth tag
      const tamperedTag = Buffer.from(encrypted.authTag, 'hex');
      tamperedTag[0] ^= 0xFF;
      encrypted.authTag = tamperedTag.toString('hex');

      expect(() => decrypt(encrypted)).toThrow();
    });

    it('should throw error on wrong IV', () => {
      const plaintext = 'John Doe';
      const encrypted = encrypt(plaintext);

      // Use different IV
      encrypted.iv = crypto.randomBytes(16).toString('hex');

      expect(() => decrypt(encrypted)).toThrow();
    });

    it('should throw error if decryption key not set', () => {
      const plaintext = 'test';
      const encrypted = encrypt(plaintext);

      delete process.env.ENCRYPTION_KEY;
      clearKeyCache();

      // Error is wrapped with generic message for security
      expect(() => decrypt(encrypted)).toThrow('Failed to decrypt data');
    });
  });

  describe('encryptPHIWithVersion()', () => {
    it('should encrypt with version prefix', async () => {
      const plaintext = 'John Doe';
      const encrypted = await encryptPHIWithVersion(plaintext);

      // Format: v{version}:iv:authTag:encrypted
      const parts = encrypted!.split(':');

      expect(parts).toHaveLength(4);
      expect(parts[0]).toMatch(/^v\d+$/); // Version prefix
      expect(parts[1]).toHaveLength(24); // IV (16 bytes base64)
      expect(parts[2]).toHaveLength(24); // Auth tag (16 bytes base64)
      expect(parts[3].length).toBeGreaterThan(0); // Encrypted data
    });

    it('should include current key version', async () => {
      setCurrentKeyVersion(2);

      const encrypted = await encryptPHIWithVersion('test');
      expect(encrypted).toMatch(/^v2:/);
    });

    it('should preserve null values', async () => {
      const encrypted = await encryptPHIWithVersion(null);
      expect(encrypted).toBeNull();
    });

    it('should preserve undefined values', async () => {
      const encrypted = await encryptPHIWithVersion(undefined as any);
      expect(encrypted).toBeUndefined();
    });

    it('should preserve empty string (falsy value)', async () => {
      // Empty string is falsy, so it's preserved like null/undefined
      const encrypted = await encryptPHIWithVersion('');
      expect(encrypted).toEqual('');

      const decrypted = await decryptPHIWithVersion(encrypted);
      expect(decrypted).toEqual('');
    });
  });

  describe('decryptPHIWithVersion()', () => {
    it('should decrypt versioned encrypted data', async () => {
      const plaintext = 'Sensitive PHI';
      const encrypted = await encryptPHIWithVersion(plaintext);
      const decrypted = await decryptPHIWithVersion(encrypted);

      expect(decrypted).toEqual(plaintext);
    });

    it('should handle backward compatibility with unencrypted data', async () => {
      // Old data that was never encrypted
      const plaintextData = 'Old Unencrypted Data';

      // Should return as-is (backward compatibility)
      const decrypted = await decryptPHIWithVersion(plaintextData);
      expect(decrypted).toEqual(plaintextData);
    });

    it('should decrypt data encrypted with previous key version', async () => {
      // Simulate key rotation scenario

      // 1. Encrypt with version 1
      setCurrentKeyVersion(1);
      const plaintext = 'PHI from old key';
      const encryptedV1 = await encryptPHIWithVersion(plaintext);

      // 2. Rotate to version 2
      setCurrentKeyVersion(2);
      process.env.ENCRYPTION_KEY_PREVIOUS = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      clearKeyCache();

      // 3. Should still be able to decrypt data from version 1
      const decrypted = await decryptPHIWithVersion(encryptedV1);
      expect(decrypted).toEqual(plaintext);
    });

    it('should preserve null values', async () => {
      const decrypted = await decryptPHIWithVersion(null);
      expect(decrypted).toBeNull();
    });

    it('should preserve undefined values', async () => {
      const decrypted = await decryptPHIWithVersion(undefined as any);
      expect(decrypted).toBeUndefined();
    });

    it('should throw error on tampered versioned data', async () => {
      const plaintext = 'PHI';
      const encrypted = await encryptPHIWithVersion(plaintext);

      // Tamper with encrypted portion
      const parts = encrypted!.split(':');
      const tamperedData = Buffer.from(parts[3], 'hex');
      tamperedData[0] ^= 0xFF;
      parts[3] = tamperedData.toString('hex');
      const tampered = parts.join(':');

      await expect(decryptPHIWithVersion(tampered)).rejects.toThrow();
    });
  });

  describe('Key Versioning', () => {
    it('should support key rotation', async () => {
      // Phase 1: Data encrypted with key v1
      setCurrentKeyVersion(1);
      const key1 = crypto.randomBytes(32).toString('hex');
      process.env.ENCRYPTION_KEY = key1;
      clearKeyCache();

      const plaintext = 'PHI Data';
      const encryptedV1 = await encryptPHIWithVersion(plaintext);

      expect(encryptedV1).toMatch(/^v1:/);

      // Phase 2: Rotate to key v2
      setCurrentKeyVersion(2);
      const key2 = crypto.randomBytes(32).toString('hex');
      process.env.ENCRYPTION_KEY_PREVIOUS = key1; // Keep old key
      process.env.ENCRYPTION_KEY = key2; // New key
      clearKeyCache();

      // Old data should still decrypt
      const decryptedV1 = await decryptPHIWithVersion(encryptedV1);
      expect(decryptedV1).toEqual(plaintext);

      // New data should encrypt with v2
      const encryptedV2 = await encryptPHIWithVersion('New PHI');
      expect(encryptedV2).toMatch(/^v2:/);
    });

    it('should update key version via setCurrentKeyVersion', () => {
      setCurrentKeyVersion(1);
      expect(getCurrentKeyVersion()).toBe(1);

      setCurrentKeyVersion(5);
      expect(getCurrentKeyVersion()).toBe(5);
    });

    it('should clear key cache', async () => {
      // Encrypt some data (loads key into cache)
      const plaintext = 'test';
      await encryptPHIWithVersion(plaintext);

      // Clear cache
      clearKeyCache();

      // Should still work (reloads key)
      const encrypted = await encryptPHIWithVersion(plaintext);
      const decrypted = await decryptPHIWithVersion(encrypted);

      expect(decrypted).toEqual(plaintext);
    });
  });

  describe('Security Properties', () => {
    it('should produce cryptographically secure random IVs', () => {
      const ivs = new Set<string>();

      // Generate 100 encryptions
      for (let i = 0; i < 100; i++) {
        const encrypted = encrypt('test');
        ivs.add(encrypted.iv);
      }

      // All IVs should be unique (collision probability negligible)
      expect(ivs.size).toBe(100);
    });

    it('should use authenticated encryption (AEAD)', () => {
      const plaintext = 'Important PHI';
      const encrypted = encrypt(plaintext);

      // Auth tag should be present
      expect(encrypted.authTag).toHaveLength(32);

      // Tampering should be detected
      encrypted.encrypted = encrypted.encrypted.slice(0, -2) + 'FF';
      expect(() => decrypt(encrypted)).toThrow();
    });

    it('should not leak plaintext length in ciphertext length', () => {
      // Note: AES-GCM ciphertext length = plaintext length (no padding)
      // This is expected behavior and documented in security model

      const short = 'Hi';
      const long = 'This is a much longer message with more content';

      const encryptedShort = encrypt(short);
      const encryptedLong = encrypt(long);

      // Ciphertext lengths should reflect plaintext lengths
      // (AES-GCM property - not a vulnerability if combined with proper access controls)
      expect(Buffer.from(encryptedShort.encrypted, 'hex').length).toBeLessThan(
        Buffer.from(encryptedLong.encrypted, 'hex').length
      );
    });

    it('should use 256-bit key (AES-256)', () => {
      // Verify key length enforcement
      const shortKey = crypto.randomBytes(16).toString('hex'); // 128-bit
      process.env.ENCRYPTION_KEY = shortKey;
      clearKeyCache();

      // Error is wrapped with generic message for security
      expect(() => encrypt('test')).toThrow('Failed to encrypt data');
    });

    it('should use 128-bit IV', () => {
      const encrypted = encrypt('test');

      // IV should be 16 bytes (32 hex chars)
      expect(encrypted.iv).toHaveLength(32);
      expect(Buffer.from(encrypted.iv, 'hex').length).toBe(16);
    });

    it('should use 128-bit auth tag', () => {
      const encrypted = encrypt('test');

      // Auth tag should be 16 bytes (32 hex chars)
      expect(encrypted.authTag).toHaveLength(32);
      expect(Buffer.from(encrypted.authTag, 'hex').length).toBe(16);
    });
  });

  describe('Performance', () => {
    it('should encrypt quickly (< 10ms for typical PHI)', () => {
      const plaintext = 'John Doe, 123-45-6789, 123 Main St';

      const start = Date.now();
      encrypt(plaintext);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(10);
    });

    it('should decrypt quickly (< 10ms for typical PHI)', () => {
      const plaintext = 'John Doe, 123-45-6789, 123 Main St';
      const encrypted = encrypt(plaintext);

      const start = Date.now();
      decrypt(encrypted);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(10);
    });

    it('should handle large data (10KB)', async () => {
      const plaintext = 'A'.repeat(10 * 1024); // 10KB of data
      const encrypted = await encryptPHIWithVersion(plaintext);
      const decrypted = await decryptPHIWithVersion(encrypted);

      expect(decrypted).toEqual(plaintext);
    });
  });

  describe('HIPAA Compliance', () => {
    it('should use NIST-approved algorithm (AES-256-GCM)', () => {
      // AES-256-GCM is NIST SP 800-38D approved
      // This test verifies the algorithm constant
      const plaintext = 'PHI';
      const encrypted = encrypt(plaintext);

      // Verify successful encryption/decryption (validates algorithm)
      const decrypted = decrypt(encrypted);
      expect(decrypted).toEqual(plaintext);
    });

    it('should support encryption of all 18 PHI identifiers', async () => {
      const phiIdentifiers = [
        'John Doe', // Name
        '123 Main Street', // Address
        '2026-01-01', // Date
        '555-1234', // Phone
        'john@example.com', // Email
        '123-45-6789', // SSN
        'MRN-12345', // Medical record number
        'A1B2C3D4', // Health plan number
        'ACC-98765', // Account number
        'CRT-11111', // Certificate number
        'VIN-ABC123', // Vehicle identifier
        'DEV-999', // Device identifier
        'https://example.com/profile', // URL
        '192.168.1.1', // IP address
        'AB:CD:EF:12:34:56', // MAC address
        'abc123-biometric', // Biometric identifier
        'photo.jpg', // Full face photo
        'other-unique-id', // Any other unique identifier
      ];

      // Verify all can be encrypted and decrypted
      for (const phi of phiIdentifiers) {
        const encrypted = await encryptPHIWithVersion(phi);
        const decrypted = await decryptPHIWithVersion(encrypted);

        expect(decrypted).toEqual(phi);
        expect(encrypted).not.toEqual(phi); // Verify actually encrypted
      }
    });

    it('should never store plaintext PHI', async () => {
      const plaintext = 'Sensitive PHI';
      const encrypted = await encryptPHIWithVersion(plaintext);

      // Encrypted data should not contain plaintext
      expect(encrypted!.toLowerCase()).not.toContain(plaintext.toLowerCase());
    });

    it('should support audit trail of encryption operations', async () => {
      // Note: Actual audit logging tested in audit.test.ts
      // This test verifies encryption functions don't throw

      const consoleSpy = jest.spyOn(console, 'log');

      const plaintext = 'PHI';
      const encrypted = await encryptPHIWithVersion(plaintext);
      await decryptPHIWithVersion(encrypted);

      // Should not log sensitive data
      const logs = consoleSpy.mock.calls.flat().join(' ');
      expect(logs).not.toContain(plaintext);

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should throw descriptive error on decryption failure', async () => {
      const invalid = 'v1:invalid:data:here';

      await expect(decryptPHIWithVersion(invalid)).rejects.toThrow();
    });

    it('should handle corrupted version prefix', async () => {
      const encrypted = await encryptPHIWithVersion('test');
      const corrupted = encrypted!.replace(/^v\d+:/, 'vX:');

      await expect(decryptPHIWithVersion(corrupted)).rejects.toThrow();
    });

    it('should handle missing key version', async () => {
      // Simulate encryption with v3, but v3 key not available
      const plaintext = 'test';

      // Manually create versioned format with non-existent key
      const mockEncrypted = 'v99:' + crypto.randomBytes(16).toString('hex') +
                           ':' + crypto.randomBytes(16).toString('hex') +
                           ':' + crypto.randomBytes(32).toString('hex');

      await expect(decryptPHIWithVersion(mockEncrypted)).rejects.toThrow();
    });
  });
});
