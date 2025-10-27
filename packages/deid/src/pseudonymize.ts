import { createHash, randomBytes, pbkdf2Sync, createHmac } from 'crypto';
import { PseudonymizationResult } from './types';

/**
 * Pseudonymize subject identifiers using PBKDF2 + HMAC
 * SECURITY IMPROVEMENTS:
 * - Uses PBKDF2 (100,000 iterations) to prevent rainbow table attacks
 * - Adds HMAC with secret pepper for additional security layer
 * - Requires both salt and pepper to be compromised for re-identification
 *
 * Generates a deterministic patient token from subject keys
 */
export function pseudonymize(
  subjectKeys: string[],
  saltRotationKey: string,
  pepper?: string // Optional secret pepper (from DEID_SECRET env var)
): PseudonymizationResult {
  // Validate inputs
  if (!subjectKeys || subjectKeys.length === 0) {
    throw new Error('Subject keys cannot be empty');
  }

  if (!saltRotationKey || saltRotationKey === 'default-salt') {
    console.error('⚠️  SECURITY WARNING: Using weak or default salt for pseudonymization!');
    console.error('⚠️  Set SALT_ROTATION_KEY environment variable to a strong random value.');
  }

  // Concatenate all subject identifiers (deterministic)
  const subjectString = subjectKeys.sort().join('|');

  // Step 1: PBKDF2 - Key derivation with 100,000 iterations
  // This makes brute-force and rainbow table attacks computationally infeasible
  const derivedKey = pbkdf2Sync(
    subjectString,
    saltRotationKey,
    100000, // iterations - NIST recommends 100k+ for PBKDF2-SHA256
    32,     // key length (256 bits)
    'sha256'
  );

  // Step 2: HMAC with pepper - Additional security layer
  // Even if salt is compromised, pepper (stored separately) protects the hash
  const pepperKey = pepper || process.env.DEID_SECRET || 'CHANGE_ME_IN_PRODUCTION';

  if (pepperKey === 'CHANGE_ME_IN_PRODUCTION') {
    console.error('⚠️  CRITICAL: DEID_SECRET not set! Pseudonymization is vulnerable!');
  }

  const hmac = createHmac('sha256', pepperKey);
  hmac.update(derivedKey);
  const pointerHash = hmac.digest('hex');

  // Generate UUID-like token for external use
  const tokenId = generateUUIDFromHash(pointerHash);

  return {
    tokenId,
    pointerHash,
  };
}

/**
 * Generate a UUID v5-like identifier from hash
 */
function generateUUIDFromHash(hash: string): string {
  // Take first 32 hex chars and format as UUID
  const hex = hash.substring(0, 32);
  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(
    12,
    16
  )}-${hex.substring(16, 20)}-${hex.substring(20, 32)}`;
}

/**
 * Verify if a subject matches a given token
 */
export function verifyPseudonym(
  subjectKeys: string[],
  saltRotationKey: string,
  expectedPointerHash: string,
  pepper?: string
): boolean {
  const result = pseudonymize(subjectKeys, saltRotationKey, pepper);
  return result.pointerHash === expectedPointerHash;
}

/**
 * Generate a new salt rotation key (for key rotation operations)
 */
export function generateSaltRotationKey(): string {
  return randomBytes(32).toString('hex');
}
