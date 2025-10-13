/**
 * Server-side Push Notification Sender
 * Sends web push notifications to subscribed users
 */

import webpush from 'web-push';
import { prisma } from '@/lib/db/prisma';

// Configure VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:notifications@holilabs.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
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
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('VAPID keys not configured - push notifications disabled');
    return { success: false, sentCount: 0, failedCount: 0, errors: ['VAPID keys not configured'] };
  }

  try {
    // Get all push subscriptions for this user
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      console.log(`No push subscriptions found for user ${userId}`);
      return { success: true, sentCount: 0, failedCount: 0, errors: [] };
    }

    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
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
            console.log(`Deleted invalid push subscription ${subscription.id}`);
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
