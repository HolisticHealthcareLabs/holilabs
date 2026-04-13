export const dynamic = "force-dynamic";
/**
 * Notifications API
 *
 * GET /api/notifications
 * Fetch notifications for authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { getNotifications } from '@/lib/notifications';
import logger from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { getSyntheticNotifications, isDemoClinician } from '@/lib/demo/synthetic';

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = parseInt(searchParams.get('offset') || '0');
      const unreadOnly = searchParams.get('unreadOnly') === 'true';

      const userId = context.user?.id;
      const userType = context.user?.role === 'PATIENT' ? 'PATIENT' : 'CLINICIAN';

      // Demo mode (DB-FREE)
      if (userType === 'CLINICIAN' && userId && isDemoClinician(userId, context.user?.email ?? null)) {
        const all = getSyntheticNotifications();
        const filtered = unreadOnly ? all.filter((n) => !n.isRead) : all;
        const page = filtered.slice(offset, offset + limit);
        return NextResponse.json({ success: true, data: page }, { status: 200 });
      }

      // Clinician or patient notifications
      const notifications = await getNotifications(userId!, userType, {
        limit,
        offset,
        unreadOnly,
      });

      logger.info({
        event: 'notifications_fetched',
        userId: userType === 'PATIENT' ? undefined : userId,
        patientId: userType === 'PATIENT' ? userId : undefined,
        userType,
        count: notifications.length,
      });

      // HIPAA Audit Log
      await createAuditLog({
        action: 'READ',
        resource: 'Notification',
        resourceId: userId!,
        details: {
          userType,
          notificationsCount: notifications.length,
          unreadOnly,
          limit,
          offset,
          accessType: userType === 'PATIENT' ? 'PATIENT_NOTIFICATION_LIST' : 'NOTIFICATION_LIST',
        },
        success: true,
      });

      return NextResponse.json(
        {
          success: true,
          data: notifications,
        },
        { status: 200 }
      );
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
  },
  { roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN', 'PATIENT'], skipCsrf: true }
);
