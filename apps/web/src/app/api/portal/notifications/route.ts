/**
 * Notifications API
 *
 * GET /api/portal/notifications - Get patient's notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPatientPortalRoute, type PatientPortalContext } from '@/lib/api/patient-portal-middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { z } from 'zod';

const NotificationsQuerySchema = z.object({
  limit: z.preprocess(
    (v) => (v === null || v === undefined || v === '' ? undefined : v),
    z.coerce.number().int().min(1).max(100).default(50)
  ),
  unreadOnly: z.preprocess(
    (v) => (v === null || v === undefined || v === '' ? undefined : v),
    z.coerce.boolean().default(false)
  ),
  type: z.string().optional(),
});

export const GET = createPatientPortalRoute(
  async (request: NextRequest, context: PatientPortalContext) => {
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

    const where: any = {
      recipientId: context.session.patientId,
      recipientType: 'PATIENT',
    };

    if (unreadOnly) {
      where.isRead = false;
    }

    if (type) {
      where.type = type;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        recipientId: context.session.patientId,
        recipientType: 'PATIENT',
        isRead: false,
      },
    });

    logger.info({
      event: 'patient_notifications_fetched',
      patientId: context.session.patientId,
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
  },
  { audit: { action: 'READ', resource: 'Notifications' } }
);
