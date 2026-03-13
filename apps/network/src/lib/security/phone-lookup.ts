/**
 * Phone Lookup — HMAC-based deterministic index
 *
 * Replaces the O(n) full-table decrypt loop in the webhook handler.
 * Uses HMAC-SHA256 with a dedicated PHONE_LOOKUP_SECRET (separate from the
 * encryption key) to produce a deterministic, indexed lookup value.
 *
 * CYRUS: The HMAC output is NOT reversible to the original phone number.
 * It is used only as an index key — never displayed or transmitted.
 *
 * Key separation: PHONE_LOOKUP_SECRET !== PHI_ENCRYPTION_KEY_V1
 * Compromising the lookup index does not expose the encrypted phone values.
 */

import crypto from 'crypto';

export function computePhoneLookup(e164Phone: string): string {
  const secret = process.env.PHONE_LOOKUP_SECRET;
  if (!secret) {
    throw new Error('PHONE_LOOKUP_SECRET is not configured');
  }
  return crypto.createHmac('sha256', secret).update(e164Phone).digest('hex');
}
