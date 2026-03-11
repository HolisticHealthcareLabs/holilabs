/**
 * NextAuth v5 API Route
 *
 * Handles all NextAuth requests:
 * - /api/auth/signin
 * - /api/auth/signout
 * - /api/auth/callback/:provider
 * - /api/auth/session
 * - /api/auth/csrf
 * - etc.
 *
 * POST to /callback/credentials is rate-limited to prevent credential stuffing.
 */

import { NextRequest } from 'next/server';
import { GET as _GET, POST as _POST } from '@/lib/auth/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export { _GET as GET };

export async function POST(request: NextRequest, context: any) {
  const isCredentialsCallback = request.nextUrl.pathname.includes('/callback/credentials');

  if (isCredentialsCallback) {
    const rateLimitResponse = await checkRateLimit(request, 'auth');
    if (rateLimitResponse) return rateLimitResponse;
  }

  return _POST(request, context);
}
