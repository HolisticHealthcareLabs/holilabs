/**
 * Patient Logout API
 *
 * POST /api/auth/patient/logout
 * Clear patient session and logout
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { getPatientSession } from '@/lib/auth/patient-session';

export async function POST(request: NextRequest) {
  try {
    // Get current session before clearing it (for audit log)
    const session = await getPatientSession();

    // Clear session cookie
    const cookieStore = cookies();
    cookieStore.delete('patient-session');

    logger.info({
      event: 'patient_logout',
      patientId: session?.patientId,
    });

    // HIPAA Audit Log: Patient logged out
    if (session) {
      await createAuditLog({
        userId: session.patientUserId,
        userEmail: session.email || 'unknown',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        action: 'LOGOUT',
        resource: 'PatientAuth',
        resourceId: session.patientUserId,
        details: {
          patientId: session.patientId,
          method: 'session_cookie',
        },
        success: true,
        request,
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Sesión cerrada exitosamente',
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({
      event: 'patient_logout_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al cerrar sesión',
      },
      { status: 500 }
    );
  }
}
