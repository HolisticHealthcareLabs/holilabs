/**
 * Cryptographically Secure Token Generation
 * Replaces insecure Math.random() with crypto.randomBytes
 *
 * SECURITY: Uses 128 bits of entropy for patient tokens
 * - Prevents brute force attacks
 * - Ensures unpredictability
 * - Includes collision detection
 */

import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';

/**
 * Generate a cryptographically secure patient token ID
 * Format: PT-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX
 *
 * @returns {string} Token ID with 128 bits of entropy
 */
export function generateSecureTokenId(): string {
  // Generate 16 bytes (128 bits) of cryptographically secure random data
  const bytes = randomBytes(16);
  const hex = bytes.toString('hex');

  // Format as PT-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX
  return `PT-${hex.slice(0, 8)}-${hex.slice(8, 16)}-${hex.slice(16, 24)}-${hex.slice(24, 32)}`;
}

/**
 * Generate a unique patient token ID with collision checking
 * Attempts up to 10 times to avoid extremely rare collisions
 *
 * @returns {Promise<string>} Unique token ID
 * @throws {Error} If unable to generate unique token after 10 attempts
 */
export async function generateUniquePatientTokenId(): Promise<string> {
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const tokenId = generateSecureTokenId();

    // Check if token already exists
    const existingPatient = await prisma.patient.findUnique({
      where: { tokenId },
      select: { id: true },
    });

    if (!existingPatient) {
      return tokenId;
    }

    // Collision detected (extremely rare with 128-bit entropy)
    console.warn(`Token collision detected on attempt ${attempt + 1}, regenerating...`);
  }

  // This should never happen with 128-bit entropy (~3.4 × 10^38 possibilities)
  throw new Error(`Failed to generate unique patient token after ${maxAttempts} attempts`);
}

/**
 * Generate secure MRN (Medical Record Number)
 * Format: MRN-XXXXXXXXXX (10 hex characters = 40 bits)
 *
 * @returns {string} Medical Record Number
 */
export function generateSecureMRN(): string {
  const bytes = randomBytes(5); // 40 bits
  const hex = bytes.toString('hex').toUpperCase();
  return `MRN-${hex}`;
}

/**
 * Validate token format
 * @param {string} token - Token to validate
 * @returns {boolean} True if valid format
 */
export function isValidTokenFormat(token: string): boolean {
  // PT-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX format
  const tokenRegex = /^PT-[0-9a-f]{8}-[0-9a-f]{8}-[0-9a-f]{8}-[0-9a-f]{8}$/i;
  return tokenRegex.test(token);
}
