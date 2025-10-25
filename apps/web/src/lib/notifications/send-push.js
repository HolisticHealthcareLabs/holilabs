"use strict";
/**
 * Server-side Push Notification Sender
 * Sends web push notifications to subscribed users
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushNotification = sendPushNotification;
exports.sendPushNotificationToMultiple = sendPushNotificationToMultiple;
exports.sendAppointmentNotification = sendAppointmentNotification;
exports.sendDocumentNotification = sendDocumentNotification;
exports.sendMessageNotification = sendMessageNotification;
exports.sendTestNotification = sendTestNotification;
const web_push_1 = __importDefault(require("web-push"));
const prisma_1 = require("@/lib/prisma");
// Configure VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:notifications@holilabs.com';
if (vapidPublicKey && vapidPrivateKey) {
    web_push_1.default.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
}
/**
 * Send push notification to a specific user
 */
async function sendPushNotification({ userId, payload, urgency = 'normal', ttl = 86400, // 24 hours default
 }) {
    if (!vapidPublicKey || !vapidPrivateKey) {
        console.warn('VAPID keys not configured - push notifications disabled');
        return { success: false, sentCount: 0, failedCount: 0, errors: ['VAPID keys not configured'] };
    }
    try {
        // Get all push subscriptions for this user
        const subscriptions = await prisma_1.prisma.pushSubscription.findMany({
            where: { userId },
        });
        if (subscriptions.length === 0) {
            console.log(`No push subscriptions found for user ${userId}`);
            return { success: true, sentCount: 0, failedCount: 0, errors: [] };
        }
        const results = await Promise.allSettled(subscriptions.map(async (subscription) => {
            const keys = subscription.keys;
            const pushSubscription = {
                endpoint: subscription.endpoint,
                keys: {
                    p256dh: keys.p256dh,
                    auth: keys.auth,
                },
            };
            try {
                await web_push_1.default.sendNotification(pushSubscription, JSON.stringify(payload), {
                    urgency,
                    TTL: ttl,
                });
                return { success: true, subscriptionId: subscription.id };
            }
            catch (error) {
                // If subscription is invalid/expired, delete it
                if (error.statusCode === 410 || error.statusCode === 404) {
                    await prisma_1.prisma.pushSubscription.delete({
                        where: { id: subscription.id },
                    });
                    console.log(`Deleted invalid push subscription ${subscription.id}`);
                }
                throw error;
            }
        }));
        // Count successes and failures
        const sentCount = results.filter((r) => r.status === 'fulfilled').length;
        const failedCount = results.filter((r) => r.status === 'rejected').length;
        const errors = results
            .filter((r) => r.status === 'rejected')
            .map((r) => r.reason?.message || 'Unknown error');
        return {
            success: sentCount > 0,
            sentCount,
            failedCount,
            errors,
        };
    }
    catch (error) {
        console.error('Error sending push notifications:', error);
        return {
            success: false,
            sentCount: 0,
            failedCount: 1,
            errors: [error instanceof Error ? error.message : 'Unknown error'],
        };
    }
}
/**
 * Send push notification to multiple users
 */
async function sendPushNotificationToMultiple({ userIds, payload, urgency = 'normal', ttl = 86400, }) {
    const results = await Promise.allSettled(userIds.map((userId) => sendPushNotification({ userId, payload, urgency, ttl })));
    const totalSent = results
        .filter((r) => r.status === 'fulfilled')
        .reduce((sum, r) => sum + r.value.sentCount, 0);
    const totalFailed = results
        .filter((r) => r.status === 'fulfilled')
        .reduce((sum, r) => sum + r.value.failedCount, 0);
    const errors = results
        .filter((r) => r.status === 'fulfilled')
        .flatMap((r) => r.value.errors);
    return {
        success: totalSent > 0,
        totalSent,
        totalFailed,
        errors,
    };
}
/**
 * Helper: Send notification for new appointment
 */
async function sendAppointmentNotification(userId, appointmentDetails) {
    return sendPushNotification({
        userId,
        payload: {
            title: 'Cita Confirmada',
            body: `Cita con ${appointmentDetails.clinicianName} el ${appointmentDetails.date} a las ${appointmentDetails.time}`,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            tag: 'appointment',
            requireInteraction: true,
            data: {
                type: 'appointment',
                url: '/portal/dashboard/appointments',
            },
            actions: [
                {
                    action: 'view',
                    title: 'Ver Cita',
                },
                {
                    action: 'dismiss',
                    title: 'Cerrar',
                },
            ],
        },
        urgency: 'high',
    });
}
/**
 * Helper: Send notification for new document
 */
async function sendDocumentNotification(userId, documentDetails) {
    return sendPushNotification({
        userId,
        payload: {
            title: 'Nuevo Documento Disponible',
            body: `${documentDetails.fileName} (${documentDetails.documentType})`,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            tag: 'document',
            data: {
                type: 'document',
                url: '/portal/dashboard/documents',
            },
            actions: [
                {
                    action: 'view',
                    title: 'Ver Documento',
                },
                {
                    action: 'dismiss',
                    title: 'Cerrar',
                },
            ],
        },
        urgency: 'normal',
    });
}
/**
 * Helper: Send notification for new message
 */
async function sendMessageNotification(userId, messageDetails) {
    return sendPushNotification({
        userId,
        payload: {
            title: `Mensaje de ${messageDetails.senderName}`,
            body: messageDetails.preview,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            tag: 'message',
            requireInteraction: true,
            data: {
                type: 'message',
                url: '/portal/dashboard/messages',
            },
            actions: [
                {
                    action: 'reply',
                    title: 'Responder',
                },
                {
                    action: 'view',
                    title: 'Ver',
                },
            ],
        },
        urgency: 'high',
    });
}
/**
 * Helper: Send test notification
 */
async function sendTestNotification(userId) {
    return sendPushNotification({
        userId,
        payload: {
            title: '✅ Notificaciones Push Funcionando',
            body: 'Esta es una notificación de prueba de Holi Labs',
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            tag: 'test',
            data: {
                type: 'test',
                timestamp: new Date().toISOString(),
            },
        },
        urgency: 'normal',
    });
}
//# sourceMappingURL=send-push.js.map