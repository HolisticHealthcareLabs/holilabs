/**
 * Mark All Notifications Read API
 *
 * POST /api/prevention/notifications/mark-all-read
 * Marks all unread notifications as read for the current user
 *
 * Phase 4: Notifications via Novu
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { NotificationType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { auditUpdate } from '@/lib/audit';
import { NOTIFICATION_TEMPLATES } from '@/lib/services/prevention-notification.service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/prevention/notifications/mark-all-read
 * Mark all prevention notifications as read
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const start = performance.now();
    const userId = context.user?.id;

    const result = await prisma.notification.updateMany({
      where: {
        recipientId: userId,
        type: { in: Object.keys(NOTIFICATION_TEMPLATES) as NotificationType[] },
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    const elapsed = performance.now() - start;

    logger.info({
      event: 'notifications_marked_all_read',
      userId,
      count: result.count,
      latencyMs: elapsed.toFixed(2),
    });

    await auditUpdate('Notification', 'bulk', request, {
      userId: userId!,
      markedReadCount: result.count,
      action: 'notifications_bulk_marked_read',
    });

    return NextResponse.json({
      success: true,
      data: {
        markedReadCount: result.count,
      },
      meta: {
        latencyMs: Math.round(elapsed),
      },
    });
  },
  { roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] }
);
