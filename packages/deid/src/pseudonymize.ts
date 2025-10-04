import { createHash, randomBytes } from 'crypto';
import { PseudonymizationResult } from './types';

/**
 * Pseudonymize subject identifiers using salted hash
 * Generates a deterministic patient token from subject keys
 */
export function pseudonymize(
  subjectKeys: string[],
  saltRotationKey: string
): PseudonymizationResult {
  // Concatenate all subject identifiers
  const subjectString = subjectKeys.sort().join('|');

  // Create salted hash
  const hash = createHash('sha256');
  hash.update(saltRotationKey);
  hash.update(subjectString);

  const pointerHash = hash.digest('hex');

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
  expectedPointerHash: string
): boolean {
  const result = pseudonymize(subjectKeys, saltRotationKey);
  return result.pointerHash === expectedPointerHash;
}

/**
 * Generate a new salt rotation key (for key rotation operations)
 */
export function generateSaltRotationKey(): string {
  return randomBytes(32).toString('hex');
}
