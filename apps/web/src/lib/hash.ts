/**
 * Cryptographic Hash Utilities for LGPD Compliance
 *
 * Provides salted SHA256 hashing for de-identifying patient IDs
 * in RLHF datasets while maintaining referential integrity.
 *
 * LGPD Article 5, X: Anonymization is the use of reasonable
 * technical means available at the time of processing.
 *
 * @module lib/hash
 */

import * as crypto from 'crypto';

/**
 * Salt key for patient ID hashing
 * CRITICAL: This must be kept secret and never logged
 * In production, this should be loaded from a secure vault (AWS KMS, HashiCorp Vault)
 */
const PATIENT_HASH_SALT = process.env.PATIENT_HASH_SALT || 'holi-lgpd-salt-change-in-production';

/**
 * De-identify a patient ID using salted SHA256 hash
 *
 * This creates a deterministic but non-reversible identifier that:
 * 1. Cannot be reversed to get the original patient ID
 * 2. Is consistent across the same patient for referential integrity
 * 3. Complies with LGPD de-identification requirements
 *
 * @param patientId - The original patient ID to hash
 * @returns SHA256 hash of (patientId + salt)
 *
 * @example
 * ```typescript
 * const hash = hashPatientId('patient-123');
 * // Returns: "a1b2c3d4e5f6..." (64 character hex string)
 * ```
 */
export function hashPatientId(patientId: string): string {
  return crypto
    .createHash('sha256')
    .update(`${patientId}:${PATIENT_HASH_SALT}`)
    .digest('hex');
}

/**
 * Generate a secure random token for access URLs
 *
 * @param length - Number of random bytes (default 32 = 64 hex chars)
 * @returns Cryptographically secure random hex string
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a hash of arbitrary data for integrity verification
 *
 * Used for:
 * - Verifying data hasn't been tampered with
 * - Creating idempotency keys
 * - Deduplication checks
 *
 * @param data - Any JSON-serializable data
 * @returns SHA256 hash of the JSON-stringified data
 */
export function hashData(data: unknown): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex');
}

/**
 * Generate HMAC for internal service authentication
 *
 * Used for agent gateway internal token verification.
 * The token is time-based with 1-minute validity windows.
 *
 * @param message - Message to sign
 * @param secret - Secret key (defaults to NEXTAUTH_SECRET)
 * @returns HMAC-SHA256 signature
 */
export function generateHmac(message: string, secret?: string): string {
  const key = secret || process.env.NEXTAUTH_SECRET || 'dev-secret';
  return crypto
    .createHmac('sha256', key)
    .update(message)
    .digest('hex');
}

/**
 * Create a time-based internal agent token
 *
 * Valid for current minute and previous minute to handle clock drift.
 *
 * @returns HMAC-signed token with embedded timestamp
 */
export function createInternalAgentToken(): string {
  const timestamp = Math.floor(Date.now() / 60000);
  return generateHmac(`agent-internal:${timestamp}`);
}

/**
 * Verify a time-based internal agent token
 *
 * @param token - Token to verify
 * @returns true if token is valid (within 1-minute window)
 */
export function verifyInternalAgentToken(token: string | null): boolean {
  if (!token) return false;

  const now = Math.floor(Date.now() / 60000);

  // Check current minute and previous minute for clock drift tolerance
  for (const timestamp of [now, now - 1]) {
    const expected = generateHmac(`agent-internal:${timestamp}`);
    if (token === expected) return true;
  }

  return false;
}

/**
 * Hash chain entry for tamper-evident audit logs
 *
 * Creates a hash that includes the previous entry's hash,
 * forming an immutable chain similar to blockchain.
 *
 * @param entry - Current entry data
 * @param previousHash - Hash of the previous entry (or "GENESIS" for first)
 * @returns SHA256 hash including the chain link
 */
export function createChainedHash(entry: unknown, previousHash: string): string {
  const payload = {
    data: entry,
    previous: previousHash,
    timestamp: new Date().toISOString(),
  };
  return hashData(payload);
}
