/**
 * Server-side Push Notification Sender
 * Sends web push notifications to subscribed users
 */

import webpush from 'web-push';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// Configure VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:notifications@holilabs.com';

// Track if VAPID has been configured
let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) {
    return true;
  }

  if (!vapidPublicKey || !vapidPrivateKey) {
    return false;
  }

  try {
    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
    vapidConfigured = true;
    return true;
  } catch (error) {
    logger.warn({
      event: 'webpush_vapid_config_failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: Record<string, any>;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export interface SendPushNotificationOptions {
  userId: string;
  payload: PushNotificationPayload;
  urgency?: 'very-low' | 'low' | 'normal' | 'high';
  ttl?: number; // Time to live in seconds
}

/**
 * Send push notification to a specific user
 */
export async function sendPushNotification({
  userId,
  payload,
  urgency = 'normal',
  ttl = 86400, // 24 hours default
}: SendPushNotificationOptions): Promise<{
  success: boolean;
  sentCount: number;
  failedCount: number;
  errors: string[];
}> {
  if (!ensureVapidConfigured()) {
    logger.warn({ event: 'webpush_vapid_not_configured' });
    return { success: false, sentCount: 0, failedCount: 0, errors: ['VAPID keys not configured'] };
  }

  try {
    // Get all push subscriptions for this user
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      logger.info({
        event: 'webpush_no_subscriptions',
        // No user ID for privacy
      });
      return { success: true, sentCount: 0, failedCount: 0, errors: [] };
    }

    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        const keys = subscription.keys as { p256dh: string; auth: string };
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: keys.p256dh,
            auth: keys.auth,
          },
        };

        try {
          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(payload),
            {
              urgency,
              TTL: ttl,
            }
          );
          return { success: true, subscriptionId: subscription.id };
        } catch (error: any) {
          // If subscription is invalid/expired, delete it
          if (error.statusCode === 410 || error.statusCode === 404) {
            await prisma.pushSubscription.delete({
              where: { id: subscription.id },
            });
            logger.info({
              event: 'webpush_subscription_deleted',
              reason: 'invalid_or_expired',
            });
          }
          throw error;
        }
      })
    );

    // Count successes and failures
    const sentCount = results.filter((r) => r.status === 'fulfilled').length;
    const failedCount = results.filter((r) => r.status === 'rejected').length;
    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => r.reason?.message || 'Unknown error');

    return {
      success: sentCount > 0,
      sentCount,
      failedCount,
      errors,
    };
  } catch (error) {
    logger.error({
      event: 'webpush_send_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
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
export async function sendPushNotificationToMultiple({
  userIds,
  payload,
  urgency = 'normal',
  ttl = 86400,
}: {
  userIds: string[];
  payload: PushNotificationPayload;
  urgency?: 'very-low' | 'low' | 'normal' | 'high';
  ttl?: number;
}): Promise<{
  success: boolean;
  totalSent: number;
  totalFailed: number;
  errors: string[];
}> {
  const results = await Promise.allSettled(
    userIds.map((userId) =>
      sendPushNotification({ userId, payload, urgency, ttl })
    )
  );

  const totalSent = results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
    .reduce((sum, r) => sum + r.value.sentCount, 0);

  const totalFailed = results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
    .reduce((sum, r) => sum + r.value.failedCount, 0);

  const errors = results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
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
export async function sendAppointmentNotification(
  userId: string,
  appointmentDetails: {
    date: string;
    time: string;
    clinicianName: string;
    type: string;
  }
) {
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
export async function sendDocumentNotification(
  userId: string,
  documentDetails: {
    fileName: string;
    documentType: string;
  }
) {
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
export async function sendMessageNotification(
  userId: string,
  messageDetails: {
    senderName: string;
    preview: string;
  }
) {
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
export async function sendTestNotification(userId: string) {
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
