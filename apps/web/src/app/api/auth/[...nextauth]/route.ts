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
import { createPublicRoute } from '@/lib/api/middleware';
import { GET as _GET, POST as _POST } from '@/lib/auth/auth';
import { checkRateLimit } from '@/lib/rate-limit';

const authGet = _GET as (...args: any[]) => Promise<Response>;
const authPost = _POST as (...args: any[]) => Promise<Response>;

export const GET = createPublicRoute(async (request: NextRequest, context: any) => {
  return authGet(request, context);
});

export const POST = createPublicRoute(async (request: NextRequest, context: any) => {
  const isCredentialsCallback = request.nextUrl.pathname.includes('/callback/credentials');

  if (isCredentialsCallback) {
    const rateLimitResponse = await checkRateLimit(request, 'auth');
    if (rateLimitResponse) return rateLimitResponse;
  }

  return authPost(request, context);
});
