"use strict";
/**
 * Notification Utility
 *
 * Simple, flexible notification system for real-time updates
 * Supports in-app, email, and SMS delivery
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = createNotification;
exports.createNotifications = createNotifications;
exports.markNotificationAsRead = markNotificationAsRead;
exports.markAllNotificationsAsRead = markAllNotificationsAsRead;
exports.deleteNotification = deleteNotification;
exports.getUnreadCount = getUnreadCount;
exports.getNotifications = getNotifications;
exports.cleanupExpiredNotifications = cleanupExpiredNotifications;
exports.notifyAppointmentReminder = notifyAppointmentReminder;
exports.notifyNewMessage = notifyNewMessage;
exports.notifyConsultationCompleted = notifyConsultationCompleted;
exports.notifyNewDocument = notifyNewDocument;
exports.notifyNewPrescription = notifyNewPrescription;
const prisma_1 = require("./prisma");
const logger_1 = __importDefault(require("./logger"));
const email_1 = require("./email");
const sms_1 = require("./sms");
/**
 * Create a notification for a user
 */
async function createNotification(options) {
    try {
        const { recipientId, recipientType, type, title, message, actionUrl, actionLabel, resourceType, resourceId, priority = 'NORMAL', sendEmail = false, sendSMS = false, metadata, expiresInDays, } = options;
        // Calculate expiration date
        const expiresAt = expiresInDays
            ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
            : undefined;
        // Create notification in database
        const notification = await prisma_1.prisma.notification.create({
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
        logger_1.default.info({
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
    }
    catch (error) {
        logger_1.default.error({
            event: 'notification_creation_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
    }
}
/**
 * Create multiple notifications at once
 */
async function createNotifications(notifications) {
    try {
        await Promise.all(notifications.map((n) => createNotification(n)));
    }
    catch (error) {
        logger_1.default.error({
            event: 'bulk_notification_creation_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
    }
}
/**
 * Mark notification as read
 */
async function markNotificationAsRead(notificationId) {
    try {
        const notification = await prisma_1.prisma.notification.update({
            where: { id: notificationId },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });
        logger_1.default.info({
            event: 'notification_read',
            notificationId,
        });
        return notification;
    }
    catch (error) {
        logger_1.default.error({
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
async function markAllNotificationsAsRead(recipientId, recipientType) {
    try {
        const result = await prisma_1.prisma.notification.updateMany({
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
        logger_1.default.info({
            event: 'all_notifications_read',
            recipientId,
            recipientType,
            count: result.count,
        });
        return result;
    }
    catch (error) {
        logger_1.default.error({
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
async function deleteNotification(notificationId) {
    try {
        await prisma_1.prisma.notification.delete({
            where: { id: notificationId },
        });
        logger_1.default.info({
            event: 'notification_deleted',
            notificationId,
        });
    }
    catch (error) {
        logger_1.default.error({
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
async function getUnreadCount(recipientId, recipientType) {
    try {
        const count = await prisma_1.prisma.notification.count({
            where: {
                recipientId,
                recipientType,
                isRead: false,
            },
        });
        return count;
    }
    catch (error) {
        logger_1.default.error({
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
async function getNotifications(recipientId, recipientType, options) {
    try {
        const { limit = 50, offset = 0, unreadOnly = false } = options || {};
        const notifications = await prisma_1.prisma.notification.findMany({
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
    }
    catch (error) {
        logger_1.default.error({
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
async function cleanupExpiredNotifications() {
    try {
        const result = await prisma_1.prisma.notification.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date(),
                },
            },
        });
        logger_1.default.info({
            event: 'expired_notifications_cleaned',
            count: result.count,
        });
        return result.count;
    }
    catch (error) {
        logger_1.default.error({
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
async function notifyAppointmentReminder(patientId, appointmentId, appointmentDate, clinicianName) {
    const dateStr = appointmentDate.toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
    // Get patient info for email/SMS
    const patient = await prisma_1.prisma.patient.findUnique({
        where: { id: patientId },
        include: {
            patientUser: true,
        },
    });
    // Send email if patient has email
    if (patient?.patientUser?.email) {
        await (0, email_1.sendAppointmentReminderEmail)(patient.patientUser.email, `${patient.firstName} ${patient.lastName}`, appointmentDate, clinicianName, 'Consulta médica');
    }
    // Send SMS if patient has phone
    if (patient?.patientUser?.phone) {
        await (0, sms_1.sendAppointmentReminderSMS)(patient.patientUser.phone, patient.firstName, appointmentDate, clinicianName);
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
async function notifyNewMessage(recipientId, recipientType, senderName, messageId) {
    return createNotification({
        recipientId,
        recipientType,
        type: 'NEW_MESSAGE',
        title: 'Nuevo Mensaje',
        message: `${senderName} te ha enviado un mensaje`,
        actionUrl: recipientType === 'PATIENT' ? `/portal/messages/${messageId}` : `/dashboard/messages/${messageId}`,
        actionLabel: 'Leer Mensaje',
        resourceType: 'Message',
        resourceId: messageId,
        priority: 'NORMAL',
    });
}
/**
 * Create consultation completed notification
 */
async function notifyConsultationCompleted(patientId, sessionId, clinicianName) {
    // Get patient info for email/SMS
    const patient = await prisma_1.prisma.patient.findUnique({
        where: { id: patientId },
        include: {
            patientUser: true,
        },
    });
    const consultationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.holilabs.com'}/portal/consultations/${sessionId}`;
    // Send email if patient has email
    if (patient?.patientUser?.email) {
        await (0, email_1.sendConsultationCompletedEmail)(patient.patientUser.email, `${patient.firstName} ${patient.lastName}`, clinicianName, consultationUrl);
    }
    // Send SMS if patient has phone
    if (patient?.patientUser?.phone) {
        await (0, sms_1.sendConsultationCompletedSMS)(patient.patientUser.phone, patient.firstName, clinicianName);
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
async function notifyNewDocument(patientId, documentId, documentTitle) {
    // Get patient info for email
    const patient = await prisma_1.prisma.patient.findUnique({
        where: { id: patientId },
        include: {
            patientUser: true,
        },
    });
    const documentUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.holilabs.com'}/portal/documents/${documentId}`;
    // Send email if patient has email
    if (patient?.patientUser?.email) {
        await (0, email_1.sendNewDocumentEmail)(patient.patientUser.email, `${patient.firstName} ${patient.lastName}`, documentTitle, documentUrl);
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
async function notifyNewPrescription(patientId, prescriptionId, clinicianName) {
    // Get patient info for email/SMS
    const patient = await prisma_1.prisma.patient.findUnique({
        where: { id: patientId },
        include: {
            patientUser: true,
        },
    });
    // Send SMS if patient has phone (important for prescriptions)
    if (patient?.patientUser?.phone) {
        await (0, sms_1.sendPrescriptionReadySMS)(patient.patientUser.phone, patient.firstName, clinicianName);
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
//# sourceMappingURL=notifications.js.map