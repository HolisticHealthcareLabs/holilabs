/**
 * Patient Session API
 *
 * GET /api/portal/auth/session - Get current patient session
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get session data from cookie
    const sessionDataCookie = cookies().get('patient_session_data');

    if (!sessionDataCookie) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 401 }
      );
    }

    const sessionData = JSON.parse(sessionDataCookie.value);

    // Check if session expired
    if (new Date() > new Date(sessionData.expiresAt)) {
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      );
    }

    // Fetch fresh patient data
    const patientUser = await prisma.patientUser.findUnique({
      where: { id: sessionData.patientUserId },
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
            email: true,
            phone: true,
          },
        },
      },
    });

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
          expiresAt: sessionData.expiresAt,
        },
        patient: patientUser.patient,
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
