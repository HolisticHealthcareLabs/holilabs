/**
 * Patient Session API
 *
 * GET /api/portal/auth/session - Get current patient session
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPatientSession, getCurrentPatient } from '@/lib/auth/patient-session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get current session
    const session = await getPatientSession();

    if (!session) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 401 }
      );
    }

    // Get patient data
    const patientUser = await getCurrentPatient();

    if (!patientUser) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        session: {
          patientUserId: patientUser.id,
          patientId: patientUser.patient.id,
          email: patientUser.email,
          expiresAt: new Date(session.expiresAt).toISOString(),
        },
        patient: {
          id: patientUser.patient.id,
          mrn: patientUser.patient.mrn,
          firstName: patientUser.patient.firstName,
          lastName: patientUser.patient.lastName,
          dateOfBirth: patientUser.patient.dateOfBirth,
          gender: patientUser.patient.gender,
          email: patientUser.patient.email,
          phone: patientUser.patient.phone,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
