/**
 * Notifications API
 *
 * GET /api/portal/notifications - Get patient's notifications
 * POST /api/portal/notifications/[id]/read - Mark notification as read
 * DELETE /api/portal/notifications/[id] - Delete notification
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { z } from 'zod';

// Query parameters schema
const NotificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  unreadOnly: z.coerce.boolean().default(false),
  type: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Authenticate patient
    const session = await requirePatientSession();

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryValidation = NotificationsQuerySchema.safeParse({
      limit: searchParams.get('limit'),
      unreadOnly: searchParams.get('unreadOnly'),
      type: searchParams.get('type'),
    });

    if (!queryValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: queryValidation.error.errors,
        },
        { status: 400 }
      );
    }

    const { limit, unreadOnly, type } = queryValidation.data;

    // Build filter conditions
    const where: any = {
      recipientId: session.patientId,
      recipientType: 'PATIENT',
    };

    if (unreadOnly) {
      where.isRead = false;
    }

    if (type) {
      where.type = type;
    }

    // Fetch notifications
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    // Count unread notifications
    const unreadCount = await prisma.notification.count({
      where: {
        recipientId: session.patientId,
        recipientType: 'PATIENT',
        isRead: false,
      },
    });

    logger.info({
      event: 'patient_notifications_fetched',
      patientId: session.patientId,
      count: notifications.length,
      unreadCount,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          notifications,
          unreadCount,
          total: notifications.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    // Check if it's an auth error
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado. Por favor, inicia sesión.',
        },
        { status: 401 }
      );
    }

    logger.error({
      event: 'patient_notifications_fetch_error',
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
