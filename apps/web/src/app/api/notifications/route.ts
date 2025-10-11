/**
 * Notifications API
 *
 * GET /api/notifications
 * Fetch notifications for authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { getNotifications } from '@/lib/notifications';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    // Check if it's a clinician or patient request
    const clinicianSession = await getServerSession(authOptions);

    if (clinicianSession?.user?.id) {
      // Clinician notifications
      const notifications = await getNotifications(
        clinicianSession.user.id,
        'CLINICIAN',
        {
          limit,
          offset,
          unreadOnly,
        }
      );

      logger.info({
        event: 'notifications_fetched',
        userId: clinicianSession.user.id,
        userType: 'CLINICIAN',
        count: notifications.length,
      });

      return NextResponse.json(
        {
          success: true,
          data: notifications,
        },
        { status: 200 }
      );
    }

    // Try patient session
    try {
      const patientSession = await requirePatientSession();

      const notifications = await getNotifications(
        patientSession.patientId,
        'PATIENT',
        {
          limit,
          offset,
          unreadOnly,
        }
      );

      logger.info({
        event: 'notifications_fetched',
        patientId: patientSession.patientId,
        userType: 'PATIENT',
        count: notifications.length,
      });

      return NextResponse.json(
        {
          success: true,
          data: notifications,
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
      event: 'notifications_fetch_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al cargar notificaciones.',
      },
      { status: 500 }
    );
  }
}
