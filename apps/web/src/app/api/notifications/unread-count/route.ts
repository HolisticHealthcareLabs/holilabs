/**
 * Notifications Unread Count API
 *
 * GET /api/notifications/unread-count
 * Get unread notification count for authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { getUnreadCount } from '@/lib/notifications';
import logger from '@/lib/logger';
import { getSyntheticNotifications, isDemoClinician } from '@/lib/demo/synthetic';

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const userId = context.user?.id;
      const userType = context.user?.role === 'PATIENT' ? 'PATIENT' : 'CLINICIAN';

      // Demo mode (DB-FREE)
      if (userType === 'CLINICIAN' && userId && isDemoClinician(userId, context.user?.email ?? null)) {
        const count = getSyntheticNotifications().filter((n) => !n.isRead).length;
        return NextResponse.json({ success: true, data: { count } }, { status: 200 });
      }

      const count = await getUnreadCount(userId!, userType);

      return NextResponse.json(
        {
          success: true,
          data: { count },
        },
        { status: 200 }
      );
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
  },
  { roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN', 'PATIENT'], skipCsrf: true }
);
