/**
 * Session API Route
 *
 * GET /api/auth/session - Get current user session
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Try clinician session first
    const clinicianSession = await getServerSession(authOptions);

    if (clinicianSession?.user?.id) {
      return NextResponse.json({
        user: {
          id: clinicianSession.user.id,
          email: clinicianSession.user.email,
          firstName: clinicianSession.user.firstName,
          lastName: clinicianSession.user.lastName,
          role: clinicianSession.user.role,
          type: 'CLINICIAN',
        },
      });
    }

    // Try patient session
    try {
      const patientSession = await requirePatientSession();

      return NextResponse.json({
        user: {
          id: patientSession.patientId,
          email: patientSession.email,
          type: 'PATIENT',
        },
      });
    } catch (error) {
      // No session found
      return NextResponse.json({ user: null }, { status: 401 });
    }
  } catch (error: any) {
    logger.error({
      event: 'session_fetch_failed',
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Failed to get session' },
      { status: 500 }
    );
  }
}
