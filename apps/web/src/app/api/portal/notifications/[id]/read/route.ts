/**
 * Mark Notification as Read API
 *
 * POST /api/portal/notifications/[id]/read - Mark notification as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate patient
    const session = await requirePatientSession();

    const notificationId = params.id;

    // Find notification
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

    // Verify ownership
    if (notification.recipientId !== session.patientId || notification.recipientType !== 'PATIENT') {
      return NextResponse.json(
        {
          success: false,
          error: 'No tienes permiso para acceder a esta notificación.',
        },
        { status: 403 }
      );
    }

    // Mark as read
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
      patientId: session.patientId,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Notificación marcada como leída.',
        data: updatedNotification,
      },
      { status: 200 }
    );
  } catch (error) {
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
      event: 'notification_mark_read_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al marcar notificación como leída.',
      },
      { status: 500 }
    );
  }
}
