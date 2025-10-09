/**
 * Push Notification Manager
 *
 * Competitive Analysis:
 * - Abridge: ✅ Push notifications for transcription complete
 * - Nuance DAX: ❌ No push notifications
 * - Suki: ❌ No push notifications
 * - Doximity: ✅ Push notifications for messages
 *
 * Impact: Improves user engagement and workflow efficiency
 * Use cases: Appointment reminders, sync complete, transcription ready
 */

export type NotificationType =
  | 'APPOINTMENT_REMINDER'
  | 'SYNC_COMPLETE'
  | 'TRANSCRIPTION_READY'
  | 'NOTE_SIGNED'
  | 'EXPORT_READY';

export interface NotificationOptions {
  title: string;
  body: string;
  type: NotificationType;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
  }>;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
}

class PushNotificationManager {
  private registration: ServiceWorkerRegistration | null = null;

  /**
   * Check if push notifications are supported
   */
  isSupported(): boolean {
    return (
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window
    );
  }

  /**
   * Get current permission status
   */
  getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      console.warn('Push notifications are not supported');
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    return permission;
  }

  /**
   * Initialize service worker registration
   */
  async init(): Promise<void> {
    if (!this.isSupported()) {
      console.warn('Push notifications are not supported');
      return;
    }

    try {
      this.registration = await navigator.serviceWorker.ready;
      console.log('✅ Service Worker ready for push notifications');
    } catch (error) {
      console.error('❌ Error initializing push notifications:', error);
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(): Promise<PushSubscription | null> {
    if (!this.registration) {
      await this.init();
    }

    if (!this.registration) {
      console.error('Service Worker not registered');
      return null;
    }

    try {
      // Check if already subscribed
      let subscription = await this.registration.pushManager.getSubscription();

      if (subscription) {
        console.log('Already subscribed to push notifications');
        return subscription;
      }

      // Subscribe to push
      // Note: In production, you'll need a VAPID public key from your backend
      // For now, we'll use a placeholder
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

      if (!vapidPublicKey) {
        console.warn('VAPID public key not configured');
        return null;
      }

      subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey),
      });

      console.log('✅ Subscribed to push notifications');

      // Send subscription to backend
      await this.sendSubscriptionToBackend(subscription);

      return subscription;
    } catch (error) {
      console.error('❌ Error subscribing to push:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    if (!this.registration) {
      await this.init();
    }

    if (!this.registration) return false;

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        console.log('✅ Unsubscribed from push notifications');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error unsubscribing from push:', error);
      return false;
    }
  }

  /**
   * Show a local notification
   */
  async showNotification(options: NotificationOptions): Promise<void> {
    if (!this.isSupported()) {
      console.warn('Notifications not supported');
      return;
    }

    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    if (!this.registration) {
      await this.init();
    }

    if (!this.registration) {
      console.error('Service Worker not registered');
      return;
    }

    try {
      // Use the web API's NotificationOptions type
      const notificationOpts: globalThis.NotificationOptions = {
        body: options.body,
        icon: options.icon || '/icon-192x192.png',
        badge: options.badge || '/icon-192x192.png',
        tag: options.tag || options.type,
        requireInteraction: options.requireInteraction || false,
        data: {
          type: options.type,
          ...options.data,
        },
      };

      // Add actions if provided (not all browsers support this)
      if (options.actions && options.actions.length > 0) {
        (notificationOpts as any).actions = options.actions;
      }

      await this.registration.showNotification(options.title, notificationOpts);

      console.log(`✅ Notification shown: ${options.title}`);
    } catch (error) {
      console.error('❌ Error showing notification:', error);
    }
  }

  /**
   * Send subscription to backend
   */
  private async sendSubscriptionToBackend(subscription: PushSubscription): Promise<void> {
    try {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });
      console.log('✅ Subscription sent to backend');
    } catch (error) {
      console.error('❌ Error sending subscription to backend:', error);
    }
  }

  /**
   * Convert VAPID key from base64 to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): BufferSource {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray.buffer;
  }
}

// Singleton instance
export const pushNotifications = new PushNotificationManager();

/**
 * Helper functions for common notifications
 */

export async function notifyAppointmentReminder(patientName: string, time: string): Promise<void> {
  await pushNotifications.showNotification({
    title: 'Recordatorio de Cita',
    body: `Cita con ${patientName} en ${time}`,
    type: 'APPOINTMENT_REMINDER',
    icon: '/icon-192x192.png',
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'Ver Detalles' },
      { action: 'dismiss', title: 'Descartar' },
    ],
  });
}

export async function notifySyncComplete(count: number): Promise<void> {
  await pushNotifications.showNotification({
    title: 'Sincronización Completa',
    body: `${count} cambios sincronizados exitosamente`,
    type: 'SYNC_COMPLETE',
    icon: '/icon-192x192.png',
    tag: 'sync-complete',
  });
}

export async function notifyTranscriptionReady(patientName: string): Promise<void> {
  await pushNotifications.showNotification({
    title: 'Transcripción Lista',
    body: `La transcripción para ${patientName} está lista`,
    type: 'TRANSCRIPTION_READY',
    icon: '/icon-192x192.png',
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'Ver Nota' },
      { action: 'dismiss', title: 'Más Tarde' },
    ],
  });
}

export async function notifyNoteSigned(patientName: string): Promise<void> {
  await pushNotifications.showNotification({
    title: 'Nota Firmada',
    body: `Nota de ${patientName} firmada correctamente`,
    type: 'NOTE_SIGNED',
    icon: '/icon-192x192.png',
  });
}

export async function notifyExportReady(format: string): Promise<void> {
  await pushNotifications.showNotification({
    title: 'Exportación Lista',
    body: `Tu exportación ${format.toUpperCase()} está lista para descargar`,
    type: 'EXPORT_READY',
    icon: '/icon-192x192.png',
    actions: [
      { action: 'download', title: 'Descargar' },
      { action: 'dismiss', title: 'Más Tarde' },
    ],
  });
}
