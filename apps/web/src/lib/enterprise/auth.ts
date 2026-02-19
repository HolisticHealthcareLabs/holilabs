/**
 * Enterprise API Authentication — Blue Ocean Phase 3
 *
 * Shared API key validation for all /api/enterprise/* routes.
 * Uses constant-time string comparison to prevent timing attacks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

export interface EnterpriseAuthResult {
  authorized: boolean;
  response?: NextResponse;
}

/**
 * Validate the x-pharma-partner-key header against env.PHARMA_PARTNER_KEY.
 *
 * Returns `{ authorized: true }` on success, or `{ authorized: false, response }` with
 * a pre-built 401 NextResponse on failure.
 *
 * Usage:
 * ```ts
 * const auth = validateEnterpriseKey(request);
 * if (!auth.authorized) return auth.response;
 * ```
 */
export function validateEnterpriseKey(request: NextRequest): EnterpriseAuthResult {
  const key = request.headers.get('x-pharma-partner-key');

  if (!key || !env.PHARMA_PARTNER_KEY) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or missing x-pharma-partner-key' },
        { status: 401 },
      ),
    };
  }

  if (!constantTimeEqual(key, env.PHARMA_PARTNER_KEY)) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or missing x-pharma-partner-key' },
        { status: 401 },
      ),
    };
  }

  return { authorized: true };
}

/**
 * Constant-time string comparison.
 * Prevents timing attacks by always comparing every character,
 * regardless of where the first mismatch occurs.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
