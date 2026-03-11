import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPatientSession } from '@/lib/auth/patient-session';
import { createPublicRoute } from '@/lib/api/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/portal/auth/whoami
 *
 * Returns the current patient session and (in development) the raw JWT token
 * so client features (e.g. socket.io) can authenticate without trying to read
 * HttpOnly cookies via document.cookie.
 */
export const GET = createPublicRoute(
  async (_request: NextRequest) => {
    const session = await getPatientSession();

    if (!session) {
      return NextResponse.json({ session: null }, { status: 200 });
    }

    const token = cookies().get('patient-session')?.value || null;

    return NextResponse.json(
      {
        session,
        token,
      },
      { status: 200 }
    );
  },
  { rateLimit: { windowMs: 60 * 1000, maxRequests: 30 } }
);


