/**
 * Web Push Notifications Service
 *
 * Server-side push notification delivery using web-push protocol
 * Supports Chrome, Firefox, Safari, Edge
 */

import webpush from 'web-push';
import logger from '@/lib/logger';

// VAPID keys for push notifications
// Generate with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@holilabs.com';

// Configure web-push
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  tag?: string;
  requireInteraction?: boolean;
}

/**
 * Send push notification to a subscriber
 */
export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushNotificationPayload
): Promise<boolean> {
  try {
    if (!isWebPushConfigured()) {
      logger.warn({
        event: 'webpush_not_configured',
        message: 'VAPID keys not configured',
      });
      console.log('[DEV MODE] Would send push notification:', payload);
      return false;
    }

    const pushPayload = JSON.stringify(payload);

    await webpush.sendNotification(subscription, pushPayload);

    logger.info({
      event: 'push_notification_sent',
      title: payload.title,
      endpoint: subscription.endpoint,
    });

    return true;
  } catch (error) {
    // Handle subscription expiration
    if (error instanceof Error && error.message.includes('410')) {
      logger.warn({
        event: 'push_subscription_expired',
        endpoint: subscription.endpoint,
      });
      return false;
    }

    logger.error({
      event: 'push_notification_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: subscription.endpoint,
    });
    return false;
  }
}

/**
 * Send appointment reminder push notification
 */
export async function sendAppointmentReminderPush(
  subscription: PushSubscription,
  appointmentDetails: {
    clinicianName: string;
    date: string;
    time: string;
  }
): Promise<boolean> {
  const { clinicianName, date, time } = appointmentDetails;

  const payload: PushNotificationPayload = {
    title: '🗓️ Recordatorio de Cita',
    body: `Cita con ${clinicianName} - ${date} a las ${time}`,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: {
      type: 'appointment_reminder',
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
    tag: 'appointment-reminder',
    requireInteraction: true,
  };

  return sendPushNotification(subscription, payload);
}

/**
 * Send new message push notification
 */
export async function sendNewMessagePush(
  subscription: PushSubscription,
  messageDetails: {
    senderName: string;
    preview: string;
  }
): Promise<boolean> {
  const { senderName, preview } = messageDetails;

  const payload: PushNotificationPayload = {
    title: `💬 Nuevo mensaje de ${senderName}`,
    body: preview,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: {
      type: 'new_message',
      url: '/portal/dashboard/messages',
    },
    actions: [
      {
        action: 'open',
        title: 'Abrir',
      },
      {
        action: 'dismiss',
        title: 'Cerrar',
      },
    ],
    tag: 'new-message',
  };

  return sendPushNotification(subscription, payload);
}

/**
 * Send lab results available push notification
 */
export async function sendLabResultsAvailablePush(
  subscription: PushSubscription,
  testName: string
): Promise<boolean> {
  const payload: PushNotificationPayload = {
    title: '🧪 Resultados de Laboratorio Disponibles',
    body: `Tus resultados de ${testName} ya están listos para ver`,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: {
      type: 'lab_results',
      url: '/portal/dashboard/lab-results',
    },
    actions: [
      {
        action: 'view',
        title: 'Ver Resultados',
      },
    ],
    tag: 'lab-results',
    requireInteraction: true,
  };

  return sendPushNotification(subscription, payload);
}

/**
 * Check if web push is configured
 */
export function isWebPushConfigured(): boolean {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

/**
 * Get VAPID public key for client-side subscription
 */
export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}
