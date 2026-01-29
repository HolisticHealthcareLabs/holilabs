/**
 * Individual Notification API
 *
 * GET /api/prevention/notifications/[notificationId] - Get notification details
 * PATCH /api/prevention/notifications/[notificationId] - Mark as read/unread
 * DELETE /api/prevention/notifications/[notificationId] - Delete notification
 *
 * Phase 4: Notifications via Novu
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { z } from 'zod';
import { auditView, auditUpdate } from '@/lib/audit';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ notificationId: string }>;
}

const UpdateNotificationSchema = z.object({
  read: z.boolean().optional(),
});

/**
 * GET /api/prevention/notifications/[notificationId]
 * Get details of a specific notification
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const start = performance.now();

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const { notificationId } = await params;

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Verify ownership
    if (notification.recipientId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const elapsed = performance.now() - start;

    // HIPAA Audit
    await auditView('Notification', notificationId, request, {
      userId: session.user.id,
      action: 'notification_viewed',
    });

    return NextResponse.json({
      success: true,
      data: notification,
      meta: { latencyMs: Math.round(elapsed) },
    });
  } catch (error) {
    logger.error({
      event: 'notification_fetch_error',
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Failed to fetch notification' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/prevention/notifications/[notificationId]
 * Update notification (mark read/unread)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const start = performance.now();

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const { notificationId } = await params;

    const body = await request.json();
    const validation = UpdateNotificationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }

    // Verify notification exists and belongs to user
    const existing = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    if (existing.recipientId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { read } = validation.data;
    const updateData: Record<string, unknown> = {};

    if (read !== undefined) {
      updateData.readAt = read ? new Date() : null;
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: updateData,
    });

    const elapsed = performance.now() - start;

    logger.info({
      event: 'notification_updated',
      notificationId,
      userId: session.user.id,
      read,
      latencyMs: elapsed.toFixed(2),
    });

    // HIPAA Audit
    await auditUpdate('Notification', notificationId, request, {
      userId: session.user.id,
      read,
      action: read ? 'notification_marked_read' : 'notification_marked_unread',
    });

    return NextResponse.json({
      success: true,
      data: updated,
      meta: { latencyMs: Math.round(elapsed) },
    });
  } catch (error) {
    logger.error({
      event: 'notification_update_error',
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/prevention/notifications/[notificationId]
 * Delete a notification
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const start = performance.now();

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const { notificationId } = await params;

    // Verify notification exists and belongs to user
    const existing = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    if (existing.recipientId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    const elapsed = performance.now() - start;

    logger.info({
      event: 'notification_deleted',
      notificationId,
      userId: session.user.id,
      latencyMs: elapsed.toFixed(2),
    });

    return NextResponse.json({
      success: true,
      message: 'Notification deleted',
      meta: { latencyMs: Math.round(elapsed) },
    });
  } catch (error) {
    logger.error({
      event: 'notification_delete_error',
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}
