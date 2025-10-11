/**
 * Notification Utility
 *
 * Simple, flexible notification system for real-time updates
 * Supports in-app, email, and SMS delivery
 */

import { prisma } from './prisma';
import logger from './logger';
import type { UserType, NotificationType, NotificationPriority } from '@prisma/client';
import {
  sendAppointmentReminderEmail,
  sendNewMessageEmail,
  sendConsultationCompletedEmail,
  sendNewDocumentEmail,
} from './email';
import {
  sendAppointmentReminderSMS,
  sendNewMessageSMS,
  sendConsultationCompletedSMS,
  sendPrescriptionReadySMS,
} from './sms';

export interface CreateNotificationOptions {
  recipientId: string;
  recipientType: UserType;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  resourceType?: string;
  resourceId?: string;
  priority?: NotificationPriority;
  sendEmail?: boolean;
  sendSMS?: boolean;
  metadata?: Record<string, any>;
  expiresInDays?: number;
}

/**
 * Create a notification for a user
 */
export async function createNotification(options: CreateNotificationOptions) {
  try {
    const {
      recipientId,
      recipientType,
      type,
      title,
      message,
      actionUrl,
      actionLabel,
      resourceType,
      resourceId,
      priority = 'NORMAL',
      sendEmail = false,
      sendSMS = false,
      metadata,
      expiresInDays,
    } = options;

    // Calculate expiration date
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : undefined;

    // Create notification in database
    const notification = await prisma.notification.create({
      data: {
        recipientId,
        recipientType,
        type,
        title,
        message,
        actionUrl,
        actionLabel,
        resourceType,
        resourceId,
        priority,
        deliveredInApp: true,
        deliveredEmail: sendEmail,
        deliveredSMS: sendSMS,
        emailSentAt: sendEmail ? new Date() : null,
        smsSentAt: sendSMS ? new Date() : null,
        expiresAt,
        metadata,
      },
    });

    logger.info({
      event: 'notification_created',
      notificationId: notification.id,
      recipientId,
      recipientType,
      type,
    });

    // TODO: Send email if requested
    if (sendEmail) {
      // await sendEmailNotification(notification);
    }

    // TODO: Send SMS if requested
    if (sendSMS) {
      // await sendSMSNotification(notification);
    }

    return notification;
  } catch (error) {
    logger.error({
      event: 'notification_creation_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Create multiple notifications at once
 */
export async function createNotifications(
  notifications: CreateNotificationOptions[]
): Promise<void> {
  try {
    await Promise.all(notifications.map((n) => createNotification(n)));
  } catch (error) {
    logger.error({
      event: 'bulk_notification_creation_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  try {
    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    logger.info({
      event: 'notification_read',
      notificationId,
    });

    return notification;
  } catch (error) {
    logger.error({
      event: 'notification_mark_read_error',
      notificationId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(
  recipientId: string,
  recipientType: UserType
) {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        recipientId,
        recipientType,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    logger.info({
      event: 'all_notifications_read',
      recipientId,
      recipientType,
      count: result.count,
    });

    return result;
  } catch (error) {
    logger.error({
      event: 'mark_all_notifications_read_error',
      recipientId,
      recipientType,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId: string) {
  try {
    await prisma.notification.delete({
      where: { id: notificationId },
    });

    logger.info({
      event: 'notification_deleted',
      notificationId,
    });
  } catch (error) {
    logger.error({
      event: 'notification_delete_error',
      notificationId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(recipientId: string, recipientType: UserType) {
  try {
    const count = await prisma.notification.count({
      where: {
        recipientId,
        recipientType,
        isRead: false,
      },
    });

    return count;
  } catch (error) {
    logger.error({
      event: 'get_unread_count_error',
      recipientId,
      recipientType,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return 0;
  }
}

/**
 * Get notifications for a user
 */
export async function getNotifications(
  recipientId: string,
  recipientType: UserType,
  options?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  }
) {
  try {
    const { limit = 50, offset = 0, unreadOnly = false } = options || {};

    const notifications = await prisma.notification.findMany({
      where: {
        recipientId,
        recipientType,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      skip: offset,
    });

    return notifications;
  } catch (error) {
    logger.error({
      event: 'get_notifications_error',
      recipientId,
      recipientType,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return [];
  }
}

/**
 * Delete expired notifications (run as cron job)
 */
export async function cleanupExpiredNotifications() {
  try {
    const result = await prisma.notification.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    logger.info({
      event: 'expired_notifications_cleaned',
      count: result.count,
    });

    return result.count;
  } catch (error) {
    logger.error({
      event: 'cleanup_expired_notifications_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return 0;
  }
}

// ============================================================================
// NOTIFICATION TEMPLATES
// ============================================================================

/**
 * Create appointment reminder notification
 */
export async function notifyAppointmentReminder(
  patientId: string,
  appointmentId: string,
  appointmentDate: Date,
  clinicianName: string
) {
  const dateStr = appointmentDate.toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Get patient info for email/SMS
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      patientUser: true,
    },
  });

  // Send email if patient has email
  if (patient?.patientUser?.email) {
    await sendAppointmentReminderEmail(
      patient.patientUser.email,
      `${patient.firstName} ${patient.lastName}`,
      appointmentDate,
      clinicianName,
      'Consulta médica'
    );
  }

  // Send SMS if patient has phone
  if (patient?.patientUser?.phone) {
    await sendAppointmentReminderSMS(
      patient.patientUser.phone,
      patient.firstName,
      appointmentDate,
      clinicianName
    );
  }

  // Create in-app notification
  return createNotification({
    recipientId: patientId,
    recipientType: 'PATIENT',
    type: 'APPOINTMENT_REMINDER',
    title: 'Recordatorio de Cita',
    message: `Tienes una cita programada con ${clinicianName} el ${dateStr}`,
    actionUrl: `/portal/appointments/${appointmentId}`,
    actionLabel: 'Ver Detalles',
    resourceType: 'Appointment',
    resourceId: appointmentId,
    priority: 'HIGH',
    sendEmail: !!patient?.patientUser?.email,
    sendSMS: !!patient?.patientUser?.phone,
  });
}

/**
 * Create new message notification
 */
export async function notifyNewMessage(
  recipientId: string,
  recipientType: UserType,
  senderName: string,
  messageId: string
) {
  return createNotification({
    recipientId,
    recipientType,
    type: 'NEW_MESSAGE',
    title: 'Nuevo Mensaje',
    message: `${senderName} te ha enviado un mensaje`,
    actionUrl:
      recipientType === 'PATIENT' ? `/portal/messages/${messageId}` : `/dashboard/messages/${messageId}`,
    actionLabel: 'Leer Mensaje',
    resourceType: 'Message',
    resourceId: messageId,
    priority: 'NORMAL',
  });
}

/**
 * Create consultation completed notification
 */
export async function notifyConsultationCompleted(
  patientId: string,
  sessionId: string,
  clinicianName: string
) {
  // Get patient info for email/SMS
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      patientUser: true,
    },
  });

  const consultationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.holilabs.com'}/portal/consultations/${sessionId}`;

  // Send email if patient has email
  if (patient?.patientUser?.email) {
    await sendConsultationCompletedEmail(
      patient.patientUser.email,
      `${patient.firstName} ${patient.lastName}`,
      clinicianName,
      consultationUrl
    );
  }

  // Send SMS if patient has phone
  if (patient?.patientUser?.phone) {
    await sendConsultationCompletedSMS(
      patient.patientUser.phone,
      patient.firstName,
      clinicianName
    );
  }

  return createNotification({
    recipientId: patientId,
    recipientType: 'PATIENT',
    type: 'CONSULTATION_COMPLETED',
    title: 'Consulta Completada',
    message: `Tu consulta con ${clinicianName} ha sido completada. Ya puedes ver las notas médicas.`,
    actionUrl: `/portal/consultations/${sessionId}`,
    actionLabel: 'Ver Notas',
    resourceType: 'ScribeSession',
    resourceId: sessionId,
    priority: 'NORMAL',
    sendEmail: !!patient?.patientUser?.email,
    sendSMS: !!patient?.patientUser?.phone,
  });
}

/**
 * Create new document notification
 */
export async function notifyNewDocument(
  patientId: string,
  documentId: string,
  documentTitle: string
) {
  // Get patient info for email
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      patientUser: true,
    },
  });

  const documentUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.holilabs.com'}/portal/documents/${documentId}`;

  // Send email if patient has email
  if (patient?.patientUser?.email) {
    await sendNewDocumentEmail(
      patient.patientUser.email,
      `${patient.firstName} ${patient.lastName}`,
      documentTitle,
      documentUrl
    );
  }

  return createNotification({
    recipientId: patientId,
    recipientType: 'PATIENT',
    type: 'NEW_DOCUMENT',
    title: 'Nuevo Documento',
    message: `Se ha subido un nuevo documento: ${documentTitle}`,
    actionUrl: `/portal/documents/${documentId}`,
    actionLabel: 'Ver Documento',
    resourceType: 'Document',
    resourceId: documentId,
    priority: 'NORMAL',
    sendEmail: !!patient?.patientUser?.email,
  });
}

/**
 * Create new prescription notification
 */
export async function notifyNewPrescription(
  patientId: string,
  prescriptionId: string,
  clinicianName: string
) {
  // Get patient info for email/SMS
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      patientUser: true,
    },
  });

  // Send SMS if patient has phone (important for prescriptions)
  if (patient?.patientUser?.phone) {
    await sendPrescriptionReadySMS(
      patient.patientUser.phone,
      patient.firstName,
      clinicianName
    );
  }

  return createNotification({
    recipientId: patientId,
    recipientType: 'PATIENT',
    type: 'NEW_PRESCRIPTION',
    title: 'Nueva Receta',
    message: `${clinicianName} ha creado una nueva receta para ti`,
    actionUrl: `/portal/medications`,
    actionLabel: 'Ver Receta',
    resourceType: 'Prescription',
    resourceId: prescriptionId,
    priority: 'HIGH',
    sendEmail: !!patient?.patientUser?.email,
    sendSMS: !!patient?.patientUser?.phone,
  });
}
