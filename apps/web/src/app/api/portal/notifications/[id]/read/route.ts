export const dynamic = "force-dynamic";
/**
 * Mark Notification as Read API
 *
 * POST /api/portal/notifications/[id]/read - Mark notification as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPatientPortalRoute, type PatientPortalContext } from '@/lib/api/patient-portal-middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const POST = createPatientPortalRoute(
  async (request: NextRequest, context: PatientPortalContext) => {
    const segments = request.nextUrl.pathname.split('/');
    const notificationId = segments[segments.length - 2]; // /api/portal/notifications/[id]/read

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return NextResponse.json(
        {
          success: false,
          error: 'Notificación no encontrada.',
        },
        { status: 404 }
      );
    }

    if (notification.recipientId !== context.session.patientId || notification.recipientType !== 'PATIENT') {
      return NextResponse.json(
        {
          success: false,
          error: 'No tienes permiso para acceder a esta notificación.',
        },
        { status: 403 }
      );
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    logger.info({
      event: 'notification_marked_read',
      notificationId,
      patientId: context.session.patientId,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Notificación marcada como leída.',
        data: updatedNotification,
      },
      { status: 200 }
    );
  },
  { audit: { action: 'UPDATE', resource: 'Notification' } }
);
