/**
 * Individual Notification API
 *
 * PUT /api/notifications/[id]
 * Mark notification as read
 *
 * DELETE /api/notifications/[id]
 * Delete notification
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { markNotificationAsRead, deleteNotification } from '@/lib/notifications';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const notificationId = params.id;

    // Check if it's a clinician or patient request
    const clinicianSession = await getServerSession(authOptions);
    let userId: string;
    let userType: 'CLINICIAN' | 'PATIENT';

    if (clinicianSession?.user?.id) {
      userId = clinicianSession.user.id;
      userType = 'CLINICIAN';
    } else {
      try {
        const patientSession = await requirePatientSession();
        userId = patientSession.patientId;
        userType = 'PATIENT';
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: 'No autorizado. Por favor, inicia sesión.',
          },
          { status: 401 }
        );
      }
    }

    // Verify notification belongs to user
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return NextResponse.json(
        {
          success: false,
          error: 'Notificación no encontrada',
        },
        { status: 404 }
      );
    }

    if (
      notification.recipientId !== userId ||
      notification.recipientType !== userType
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'No tienes permiso para actualizar esta notificación',
        },
        { status: 403 }
      );
    }

    // Mark as read
    const updated = await markNotificationAsRead(notificationId);

    // HIPAA Audit Log: Notification marked as read
    await createAuditLog({
      action: 'UPDATE',
      resource: 'Notification',
      resourceId: notificationId,
      details: {
        userType,
        notificationId,
        action: 'mark_as_read',
        accessType: 'NOTIFICATION_UPDATE',
      },
      success: true,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Notificación marcada como leída',
        data: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({
      event: 'notification_update_error',
      notificationId: params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al actualizar notificación.',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const notificationId = params.id;

    // Check if it's a clinician or patient request
    const clinicianSession = await getServerSession(authOptions);
    let userId: string;
    let userType: 'CLINICIAN' | 'PATIENT';

    if (clinicianSession?.user?.id) {
      userId = clinicianSession.user.id;
      userType = 'CLINICIAN';
    } else {
      try {
        const patientSession = await requirePatientSession();
        userId = patientSession.patientId;
        userType = 'PATIENT';
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: 'No autorizado. Por favor, inicia sesión.',
          },
          { status: 401 }
        );
      }
    }

    // Verify notification belongs to user
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return NextResponse.json(
        {
          success: false,
          error: 'Notificación no encontrada',
        },
        { status: 404 }
      );
    }

    if (
      notification.recipientId !== userId ||
      notification.recipientType !== userType
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'No tienes permiso para eliminar esta notificación',
        },
        { status: 403 }
      );
    }

    // Delete notification
    await deleteNotification(notificationId);

    // HIPAA Audit Log: Notification deleted
    await createAuditLog({
      action: 'DELETE',
      resource: 'Notification',
      resourceId: notificationId,
      details: {
        userType,
        notificationId,
        action: 'delete',
        accessType: 'NOTIFICATION_DELETE',
      },
      success: true,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Notificación eliminada',
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({
      event: 'notification_delete_error',
      notificationId: params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al eliminar notificación.',
      },
      { status: 500 }
    );
  }
}
