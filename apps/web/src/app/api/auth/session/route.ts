/**
 * Session API Route
 *
 * GET /api/auth/session - Get current user session
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requirePatientSession } from '@/lib/auth/patient-session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Try clinician session first
    const clinicianSession = await getServerSession(authOptions);

    if (clinicianSession?.user) {
      const user = clinicianSession.user as any;
      if (user.id) {
        return NextResponse.json({
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            type: 'CLINICIAN',
          },
        });
      }
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
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json(
      { error: 'Failed to get session' },
      { status: 500 }
    );
  }
}
