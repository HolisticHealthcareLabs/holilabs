/**
 * Mark All Notifications Read API
 *
 * POST /api/prevention/notifications/mark-all-read
 * Marks all unread notifications as read for the current user
 *
 * Phase 4: Notifications via Novu
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { auditUpdate } from '@/lib/audit';
import { NOTIFICATION_TEMPLATES } from '@/lib/services/prevention-notification.service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/prevention/notifications/mark-all-read
 * Mark all prevention notifications as read
 */
export async function POST(request: NextRequest) {
  const start = performance.now();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    // Update all unread prevention notifications for this user
    const result = await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        type: { in: Object.keys(NOTIFICATION_TEMPLATES) },
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    const elapsed = performance.now() - start;

    logger.info({
      event: 'notifications_marked_all_read',
      userId: session.user.id,
      count: result.count,
      latencyMs: elapsed.toFixed(2),
    });

    // HIPAA Audit
    await auditUpdate('Notification', 'bulk', request, {
      userId: session.user.id,
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
  } catch (error) {
    const elapsed = performance.now() - start;

    logger.error({
      event: 'mark_all_read_error',
      error: error instanceof Error ? error.message : String(error),
      latencyMs: elapsed.toFixed(2),
    });

    return NextResponse.json(
      {
        error: 'Failed to mark notifications as read',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
