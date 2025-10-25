/**
 * Web Push - Client-Side Functions
 *
 * Browser-only push notification functions
 * Safe to import in 'use client' components
 */

'use client';

/**
 * Check if push notifications are supported in this browser
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
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(vapidPublicKey: string): Promise<PushSubscription | null> {
  try {
    if (!isPushNotificationSupported()) {
      return null;
    }

    // Request permission first
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      return null;
    }

    // Register service worker if not already registered
    const registration = await navigator.serviceWorker.ready;

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    if (!isPushNotificationSupported()) {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error);
    return false;
  }
}

/**
 * Check if already subscribed to push notifications
 */
export async function isPushSubscribed(): Promise<boolean> {
  try {
    if (!isPushNotificationSupported()) {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    return !!subscription;
  } catch (error) {
    console.error('Failed to check push subscription:', error);
    return false;
  }
}

/**
 * Get current push subscription
 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  try {
    if (!isPushNotificationSupported()) {
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error('Failed to get push subscription:', error);
    return null;
  }
}

/**
 * Convert base64 VAPID key to Uint8Array
 * Required for push subscription
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
 * Get VAPID public key from environment
 */
export function getVapidPublicKey(): string {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
}
