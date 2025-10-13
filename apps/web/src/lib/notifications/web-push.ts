/**
 * Web Push Notification Utilities
 * Handles push notification subscriptions and sending
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// VAPID keys for Web Push (should be in environment variables)
export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
export const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
export const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:notifications@holilabs.com';

/**
 * Check if Web Push is supported in the browser
 */
export function isPushNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported in this browser');
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Subscribe user to push notifications
 */
export async function subscribeToPushNotifications(
  patientId: string
): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) {
    console.warn('Push notifications not supported');
    return null;
  }

  try {
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Subscribe to push notifications
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }

    // Save subscription to backend
    await fetch('/api/portal/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        patientId,
      }),
    });

    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!isPushNotificationSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const successful = await subscription.unsubscribe();

      if (successful) {
        // Remove subscription from backend
        await fetch('/api/portal/notifications/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
          }),
        });
      }

      return successful;
    }

    return false;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
}

/**
 * Check if user is subscribed to push notifications
 */
export async function isPushSubscribed(): Promise<boolean> {
  if (!isPushNotificationSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch (error) {
    console.error('Error checking push subscription:', error);
    return false;
  }
}

/**
 * Convert VAPID public key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Send push notification (server-side)
 */
export async function sendPushNotification(
  subscriptionId: string,
  payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: any;
  }
): Promise<boolean> {
  try {
    // This would use web-push library on the server
    // For now, this is a placeholder
    console.log('Sending push notification:', { subscriptionId, payload });
    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

/**
 * Test push notification
 */
export async function sendTestNotification(): Promise<void> {
  if (!isPushNotificationSupported()) {
    alert('Push notifications are not supported in your browser');
    return;
  }

  const permission = await Notification.requestPermission();

  if (permission === 'granted') {
    new Notification('Test Notification', {
      body: 'Push notifications are working correctly!',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: 'test-notification',
    });
  } else {
    alert('Notification permission denied');
  }
}
