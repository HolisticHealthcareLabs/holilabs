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
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { z } from 'zod';
import { auditView, auditUpdate } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const UpdateNotificationSchema = z.object({
  read: z.boolean().optional(),
});

const ROLES = ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as const;

/**
 * GET /api/prevention/notifications/[notificationId]
 * Get details of a specific notification
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const start = performance.now();
    const params = await Promise.resolve(context.params ?? {});
    const notificationId = params?.notificationId;
    const userId = context.user?.id;

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    if (notification.recipientId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const elapsed = performance.now() - start;

    await auditView('Notification', notificationId, request, {
      userId: userId!,
      action: 'notification_viewed',
    });

    return NextResponse.json({
      success: true,
      data: notification,
      meta: { latencyMs: Math.round(elapsed) },
    });
  },
  { roles: [...ROLES] }
);

/**
 * PATCH /api/prevention/notifications/[notificationId]
 * Update notification (mark read/unread)
 */
export const PATCH = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const start = performance.now();
    const params = await Promise.resolve(context.params ?? {});
    const notificationId = params?.notificationId;
    const userId = context.user?.id;

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }

    const body = await request.json();
    const validation = UpdateNotificationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const existing = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    if (existing.recipientId !== userId) {
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
      userId,
      read,
      latencyMs: elapsed.toFixed(2),
    });

    await auditUpdate('Notification', notificationId, request, {
      userId: userId!,
      read,
      action: read ? 'notification_marked_read' : 'notification_marked_unread',
    });

    return NextResponse.json({
      success: true,
      data: updated,
      meta: { latencyMs: Math.round(elapsed) },
    });
  },
  { roles: [...ROLES] }
);

/**
 * DELETE /api/prevention/notifications/[notificationId]
 * Delete a notification
 */
export const DELETE = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const start = performance.now();
    const params = await Promise.resolve(context.params ?? {});
    const notificationId = params?.notificationId;
    const userId = context.user?.id;

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }

    const existing = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    if (existing.recipientId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    const elapsed = performance.now() - start;

    logger.info({
      event: 'notification_deleted',
      notificationId,
      userId,
      latencyMs: elapsed.toFixed(2),
    });

    return NextResponse.json({
      success: true,
      message: 'Notification deleted',
      meta: { latencyMs: Math.round(elapsed) },
    });
  },
  { roles: [...ROLES] }
);
