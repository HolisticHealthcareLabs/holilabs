"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushNotifications = void 0;
exports.notifyAppointmentReminder = notifyAppointmentReminder;
exports.notifySyncComplete = notifySyncComplete;
exports.notifyTranscriptionReady = notifyTranscriptionReady;
exports.notifyNoteSigned = notifyNoteSigned;
exports.notifyExportReady = notifyExportReady;
class PushNotificationManager {
    registration = null;
    /**
     * Check if push notifications are supported
     */
    isSupported() {
        return ('Notification' in window &&
            'serviceWorker' in navigator &&
            'PushManager' in window);
    }
    /**
     * Get current permission status
     */
    getPermission() {
        if (!this.isSupported())
            return 'denied';
        return Notification.permission;
    }
    /**
     * Request notification permission
     */
    async requestPermission() {
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
    async init() {
        if (!this.isSupported()) {
            console.warn('Push notifications are not supported');
            return;
        }
        try {
            this.registration = await navigator.serviceWorker.ready;
            console.log('✅ Service Worker ready for push notifications');
        }
        catch (error) {
            console.error('❌ Error initializing push notifications:', error);
        }
    }
    /**
     * Subscribe to push notifications
     */
    async subscribe() {
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
        }
        catch (error) {
            console.error('❌ Error subscribing to push:', error);
            return null;
        }
    }
    /**
     * Unsubscribe from push notifications
     */
    async unsubscribe() {
        if (!this.registration) {
            await this.init();
        }
        if (!this.registration)
            return false;
        try {
            const subscription = await this.registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
                console.log('✅ Unsubscribed from push notifications');
                return true;
            }
            return false;
        }
        catch (error) {
            console.error('❌ Error unsubscribing from push:', error);
            return false;
        }
    }
    /**
     * Show a local notification
     */
    async showNotification(options) {
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
            const notificationOpts = {
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
                notificationOpts.actions = options.actions;
            }
            await this.registration.showNotification(options.title, notificationOpts);
            console.log(`✅ Notification shown: ${options.title}`);
        }
        catch (error) {
            console.error('❌ Error showing notification:', error);
        }
    }
    /**
     * Send subscription to backend
     */
    async sendSubscriptionToBackend(subscription) {
        try {
            await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(subscription),
            });
            console.log('✅ Subscription sent to backend');
        }
        catch (error) {
            console.error('❌ Error sending subscription to backend:', error);
        }
    }
    /**
     * Convert VAPID key from base64 to Uint8Array
     */
    urlBase64ToUint8Array(base64String) {
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
exports.pushNotifications = new PushNotificationManager();
/**
 * Helper functions for common notifications
 */
async function notifyAppointmentReminder(patientName, time) {
    await exports.pushNotifications.showNotification({
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
async function notifySyncComplete(count) {
    await exports.pushNotifications.showNotification({
        title: 'Sincronización Completa',
        body: `${count} cambios sincronizados exitosamente`,
        type: 'SYNC_COMPLETE',
        icon: '/icon-192x192.png',
        tag: 'sync-complete',
    });
}
async function notifyTranscriptionReady(patientName) {
    await exports.pushNotifications.showNotification({
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
async function notifyNoteSigned(patientName) {
    await exports.pushNotifications.showNotification({
        title: 'Nota Firmada',
        body: `Nota de ${patientName} firmada correctamente`,
        type: 'NOTE_SIGNED',
        icon: '/icon-192x192.png',
    });
}
async function notifyExportReady(format) {
    await exports.pushNotifications.showNotification({
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
//# sourceMappingURL=push-notifications.js.map