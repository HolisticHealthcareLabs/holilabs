import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { createPublicRoute } from '@/lib/api/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/whoami
 *
 * Safe, non-conflicting endpoint to fetch the current NextAuth session.
 * (Useful for client utilities like socket auth without relying on `/api/auth/session`.)
 */
export const GET = createPublicRoute(
  async () => {
  const session = await auth();
  return NextResponse.json({ session }, { status: 200 });
  },
  { rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 10 } }
);


