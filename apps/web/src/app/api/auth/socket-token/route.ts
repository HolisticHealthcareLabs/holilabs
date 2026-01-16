import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { getUserSessionToken } from '@/lib/socket-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/socket-token
 * Returns a signed JWT for Socket.IO auth (CLINICIAN).
 */
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = await getUserSessionToken(session.user.id);
  if (!token) {
    return NextResponse.json({ error: 'Failed to mint socket token' }, { status: 500 });
  }

  return NextResponse.json({ token }, { status: 200 });
}
