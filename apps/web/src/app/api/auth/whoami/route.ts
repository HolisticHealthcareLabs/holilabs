import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/whoami
 *
 * Safe, non-conflicting endpoint to fetch the current NextAuth session.
 * (Useful for client utilities like socket auth without relying on `/api/auth/session`.)
 */
export async function GET() {
  const session = await auth();
  return NextResponse.json({ session }, { status: 200 });
}


