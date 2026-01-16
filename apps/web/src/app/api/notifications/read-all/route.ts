/**
 * Mark All Notifications as Read API
 *
 * PUT /api/notifications/read-all
 * Mark all notifications as read for authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { markAllNotificationsAsRead } from '@/lib/notifications';
import logger from '@/lib/logger';

export async function PUT(request: NextRequest) {
  try {
    // Check if it's a clinician or patient request
    const clinicianSession = await auth();

    if (clinicianSession?.user?.id) {
      // Mark all clinician notifications as read
      const result = await markAllNotificationsAsRead(
        clinicianSession.user.id,
        'CLINICIAN'
      );

      return NextResponse.json(
        {
          success: true,
          message: 'Todas las notificaciones marcadas como leídas',
          data: { count: result.count },
        },
        { status: 200 }
      );
    }

    // Try patient session
    try {
      const patientSession = await requirePatientSession();

      // Mark all patient notifications as read
      const result = await markAllNotificationsAsRead(
        patientSession.patientId,
        'PATIENT'
      );

      return NextResponse.json(
        {
          success: true,
          message: 'Todas las notificaciones marcadas como leídas',
          data: { count: result.count },
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
      event: 'mark_all_notifications_read_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al marcar notificaciones como leídas.',
      },
      { status: 500 }
    );
  }
}
