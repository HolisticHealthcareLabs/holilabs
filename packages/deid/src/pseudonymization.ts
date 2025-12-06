import { createHash, randomBytes, pbkdf2Sync } from 'crypto';

/**
 * Pseudonymize subject keys using PBKDF2 + HMAC
 * @param subjectKeys - Array of subject identifiers to pseudonymize
 * @param saltKey - Salt rotation key for PBKDF2
 * @param pepper - Optional pepper value for additional security
 * @returns Object containing tokenId and pointerHash
 */
export function pseudonymize(
  subjectKeys: string[],
  saltKey: string,
  pepper?: string
): { tokenId: string; pointerHash: string } {
  // Combine subject keys into a single string
  const combinedKeys = subjectKeys.sort().join('|');

  // Apply pepper if provided
  const keyWithPepper = pepper ? `${combinedKeys}:${pepper}` : combinedKeys;

  // Generate a deterministic token using PBKDF2
  const tokenId = pbkdf2Sync(
    keyWithPepper,
    saltKey,
    100000, // iterations
    32, // key length
    'sha256'
  ).toString('hex');

  // Generate pointer hash using HMAC-like approach
  const pointerHash = createHash('sha256')
    .update(`${tokenId}:${saltKey}`)
    .digest('hex');

  return {
    tokenId,
    pointerHash,
  };
}

/**
 * Verify a pseudonymized token against subject keys
 * @param subjectKeys - Array of subject identifiers to verify
 * @param saltKey - Salt rotation key used during pseudonymization
 * @param pepper - Optional pepper value used during pseudonymization
 * @param expectedTokenId - Expected token ID to verify against
 * @returns True if the token matches, false otherwise
 */
export function verifyPseudonym(
  subjectKeys: string[],
  saltKey: string,
  pepper: string | undefined,
  expectedTokenId: string
): boolean {
  const { tokenId } = pseudonymize(subjectKeys, saltKey, pepper);
  return tokenId === expectedTokenId;
}
