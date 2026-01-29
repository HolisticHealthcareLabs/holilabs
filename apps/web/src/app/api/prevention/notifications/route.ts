/**
 * Prevention Notifications API
 *
 * GET /api/prevention/notifications - Get user notifications
 * POST /api/prevention/notifications - Send a notification (internal use)
 *
 * Phase 4: Notifications via Novu
 * Latency Budget: ≤200ms
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { NotificationType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { z } from 'zod';
import { auditView, auditCreate } from '@/lib/audit';
import {
  getPreventionNotificationService,
  NOTIFICATION_TEMPLATES,
  type NotificationTemplate,
} from '@/lib/services/prevention-notification.service';

export const dynamic = 'force-dynamic';

// Query params schema for GET
const GetNotificationsSchema = z.object({
  type: z.string().optional(),
  unreadOnly: z.coerce.boolean().optional().default(false),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});

// Request schema for POST
const SendNotificationSchema = z.object({
  type: z.enum([
    'CONDITION_DETECTED',
    'SCREENING_REMINDER',
    'SCREENING_OVERDUE',
    'SCREENING_RESULT',
    'PLAN_UPDATED',
    'MULTIPLE_CONDITIONS_DETECTED',
  ] as const),
  recipientId: z.string().min(1),
  recipientType: z.enum(['clinician', 'patient']),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  data: z.record(z.unknown()).optional().default({}),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  channels: z.array(z.enum(['in_app', 'push', 'email', 'sms', 'whatsapp'])).optional(),
  scheduledFor: z.string().optional(),
});

/**
 * GET /api/prevention/notifications
 * Fetch notifications for the current user
 */
export async function GET(request: NextRequest) {
  const start = performance.now();

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      type: searchParams.get('type') || undefined,
      unreadOnly: searchParams.get('unreadOnly') === 'true',
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
    };

    const validation = GetNotificationsSchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { type, unreadOnly, limit, offset } = validation.data;

    // Build query conditions
    const where: Record<string, unknown> = { recipientId: session.user.id };

    if (type) {
      where.type = type;
    }

    if (unreadOnly) {
      where.readAt = null;
    }

    // Filter to prevention-related notifications
    where.type = {
      in: Object.keys(NOTIFICATION_TEMPLATES) as NotificationType[],
    };

    // Fetch notifications with counts in parallel
    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          metadata: true,
          priority: true,
          readAt: true,
          createdAt: true,
          deliveredInApp: true,
          deliveredEmail: true,
          deliveredSMS: true,
        },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          recipientId: session.user.id,
          type: { in: Object.keys(NOTIFICATION_TEMPLATES) as NotificationType[] },
          readAt: null,
        },
      }),
    ]);

    const elapsed = performance.now() - start;

    logger.info({
      event: 'notifications_fetched',
      userId: session.user.id,
      count: notifications.length,
      unreadCount,
      latencyMs: elapsed.toFixed(2),
    });

    // HIPAA Audit
    await auditView('Notification', session.user.id, request, {
      notificationCount: notifications.length,
      action: 'notifications_viewed',
    });

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + notifications.length < total,
        },
        unreadCount,
      },
      meta: {
        latencyMs: Math.round(elapsed),
      },
    });
  } catch (error) {
    const elapsed = performance.now() - start;

    logger.error({
      event: 'notifications_fetch_error',
      error: error instanceof Error ? error.message : String(error),
      latencyMs: elapsed.toFixed(2),
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch notifications',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/prevention/notifications
 * Send a prevention notification (internal use or admin)
 */
export async function POST(request: NextRequest) {
  const start = performance.now();

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = SendNotificationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const {
      type,
      recipientId,
      recipientType,
      title,
      message,
      data,
      priority,
      channels,
      scheduledFor,
    } = validation.data;

    // Verify recipient exists
    if (recipientType === 'clinician') {
      const user = await prisma.user.findUnique({
        where: { id: recipientId },
        select: { id: true },
      });
      if (!user) {
        return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
      }
    } else {
      const patient = await prisma.patient.findUnique({
        where: { id: recipientId },
        select: { id: true },
      });
      if (!patient) {
        return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
      }
    }

    const notificationService = getPreventionNotificationService();

    const result = await notificationService.sendNotification({
      type: type as NotificationTemplate,
      recipientId,
      recipientType,
      title,
      message,
      data,
      priority,
      channels,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
    });

    const elapsed = performance.now() - start;

    logger.info({
      event: 'notification_sent_via_api',
      notificationId: result.id,
      type,
      recipientId,
      success: result.success,
      sentBy: session.user.id,
      latencyMs: elapsed.toFixed(2),
    });

    // HIPAA Audit
    await auditCreate('Notification', result.id, request, {
      type,
      recipientId,
      sentBy: session.user.id,
      action: 'notification_sent',
    });

    return NextResponse.json({
      success: result.success,
      data: {
        id: result.id,
        deliveryResults: result.deliveryResults,
      },
      meta: {
        latencyMs: Math.round(elapsed),
      },
    });
  } catch (error) {
    const elapsed = performance.now() - start;

    logger.error({
      event: 'notification_send_error',
      error: error instanceof Error ? error.message : String(error),
      latencyMs: elapsed.toFixed(2),
    });

    return NextResponse.json(
      {
        error: 'Failed to send notification',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
