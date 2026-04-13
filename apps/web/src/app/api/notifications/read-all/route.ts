export const dynamic = "force-dynamic";
/**
 * Mark All Notifications as Read API
 *
 * PUT /api/notifications/read-all
 * Mark all notifications as read for authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { markAllNotificationsAsRead } from '@/lib/notifications';
import logger from '@/lib/logger';
import { getSyntheticNotifications, isDemoClinician } from '@/lib/demo/synthetic';

export const PUT = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const userId = context.user?.id;
      const userType = context.user?.role === 'PATIENT' ? 'PATIENT' : 'CLINICIAN';

      // Demo mode (DB-FREE)
      if (userType === 'CLINICIAN' && userId && isDemoClinician(userId, context.user?.email ?? null)) {
        const count = getSyntheticNotifications().filter((n) => !n.isRead).length;
        return NextResponse.json(
          {
            success: true,
            message: 'Todas las notificaciones marcadas como leídas',
            data: { count },
          },
          { status: 200 }
        );
      }

      const result = await markAllNotificationsAsRead(userId!, userType);

      return NextResponse.json(
        {
          success: true,
          message: 'Todas las notificaciones marcadas como leídas',
          data: { count: result.count },
        },
        { status: 200 }
      );
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
  },
  { roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN', 'PATIENT'], skipCsrf: true }
);
