/**
 * Notifications Unread Count API
 *
 * GET /api/notifications/unread-count
 * Get unread notification count for authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { getUnreadCount } from '@/lib/notifications';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Check if it's a clinician or patient request
    const clinicianSession = await auth();

    if (clinicianSession?.user?.id) {
      // Clinician unread count
      const count = await getUnreadCount(clinicianSession.user.id, 'CLINICIAN');

      return NextResponse.json(
        {
          success: true,
          data: { count },
        },
        { status: 200 }
      );
    }

    // Try patient session
    try {
      const patientSession = await requirePatientSession();
      const count = await getUnreadCount(patientSession.patientId, 'PATIENT');

      return NextResponse.json(
        {
          success: true,
          data: { count },
        },
        { status: 200 }
      );
    } catch (error) {
      // Not a patient either
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado. Por favor, inicia sesión.',
        },
        { status: 401 }
      );
    }
  } catch (error) {
    logger.error({
      event: 'unread_count_fetch_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al cargar conteo de notificaciones.',
      },
      { status: 500 }
    );
  }
}
