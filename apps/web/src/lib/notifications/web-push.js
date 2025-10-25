"use strict";
/**
 * Web Push Notification Utilities
 * Handles push notification subscriptions and sending
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VAPID_EMAIL = exports.VAPID_PRIVATE_KEY = exports.VAPID_PUBLIC_KEY = void 0;
exports.isPushNotificationSupported = isPushNotificationSupported;
exports.requestNotificationPermission = requestNotificationPermission;
exports.subscribeToPushNotifications = subscribeToPushNotifications;
exports.unsubscribeFromPushNotifications = unsubscribeFromPushNotifications;
exports.isPushSubscribed = isPushSubscribed;
exports.sendPushNotification = sendPushNotification;
exports.sendTestNotification = sendTestNotification;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// VAPID keys for Web Push (should be in environment variables)
exports.VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
exports.VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
exports.VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:notifications@holilabs.com';
/**
 * Check if Web Push is supported in the browser
 */
function isPushNotificationSupported() {
    if (typeof window === 'undefined')
        return false;
    return 'serviceWorker' in navigator && 'PushManager' in window;
}
/**
 * Request notification permission from user
 */
async function requestNotificationPermission() {
    if (!isPushNotificationSupported()) {
        throw new Error('Push notifications are not supported in this browser');
    }
    const permission = await Notification.requestPermission();
    return permission;
}
/**
 * Subscribe user to push notifications
 */
async function subscribeToPushNotifications(patientId) {
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
                applicationServerKey: urlBase64ToUint8Array(exports.VAPID_PUBLIC_KEY),
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
    }
    catch (error) {
        console.error('Error subscribing to push notifications:', error);
        return null;
    }
}
/**
 * Unsubscribe from push notifications
 */
async function unsubscribeFromPushNotifications() {
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
    }
    catch (error) {
        console.error('Error unsubscribing from push notifications:', error);
        return false;
    }
}
/**
 * Check if user is subscribed to push notifications
 */
async function isPushSubscribed() {
    if (!isPushNotificationSupported()) {
        return false;
    }
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        return subscription !== null;
    }
    catch (error) {
        console.error('Error checking push subscription:', error);
        return false;
    }
}
/**
 * Convert VAPID public key to Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
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
async function sendPushNotification(subscriptionId, payload) {
    try {
        // This would use web-push library on the server
        // For now, this is a placeholder
        console.log('Sending push notification:', { subscriptionId, payload });
        return true;
    }
    catch (error) {
        console.error('Error sending push notification:', error);
        return false;
    }
}
/**
 * Test push notification
 */
async function sendTestNotification() {
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
    }
    else {
        alert('Notification permission denied');
    }
}
//# sourceMappingURL=web-push.js.map