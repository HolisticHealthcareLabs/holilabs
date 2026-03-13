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
import { createProtectedRoute } from '@/lib/api/middleware';
import { markNotificationAsRead, deleteNotification } from '@/lib/notifications';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { getSyntheticNotifications, isDemoClinician } from '@/lib/demo/synthetic';

export const PUT = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const params = await Promise.resolve(context.params ?? ({} as any));
      const notificationId = params?.id;

      const userId = context.user?.id;
      const userType = context.user?.role === 'PATIENT' ? 'PATIENT' : 'CLINICIAN';

      // Demo mode (DB-FREE): accept mark-as-read without DB
      if (userType === 'CLINICIAN' && userId && isDemoClinician(userId, context.user?.email ?? null)) {
        const existing = getSyntheticNotifications().find((n) => n.id === notificationId);
        if (!existing) {
          return NextResponse.json({ success: false, error: 'Notificación no encontrada' }, { status: 404 });
        }
        return NextResponse.json(
          {
            success: true,
            message: 'Notificación marcada como leída',
            data: { ...existing, isRead: true },
          },
          { status: 200 }
        );
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
      const errParams = await Promise.resolve(context.params ?? ({} as any));
      logger.error({
        event: 'notification_update_error',
        notificationId: errParams?.id,
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
  },
  { roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN', 'PATIENT'], skipCsrf: true }
);

export const DELETE = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const params = await Promise.resolve(context.params ?? ({} as any));
      const notificationId = params?.id;

      const userId = context.user?.id;
      const userType = context.user?.role === 'PATIENT' ? 'PATIENT' : 'CLINICIAN';

      // Demo mode (DB-FREE): accept delete without DB
      if (userType === 'CLINICIAN' && userId && isDemoClinician(userId, context.user?.email ?? null)) {
        const existing = getSyntheticNotifications().find((n) => n.id === notificationId);
        if (!existing) {
          return NextResponse.json({ success: false, error: 'Notificación no encontrada' }, { status: 404 });
        }
        return NextResponse.json(
          { success: true, message: 'Notificación eliminada' },
          { status: 200 }
        );
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
      const errParams = await Promise.resolve(context.params ?? ({} as any));
      logger.error({
        event: 'notification_delete_error',
        notificationId: errParams?.id,
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
  },
  { roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN', 'PATIENT'], skipCsrf: true }
);
