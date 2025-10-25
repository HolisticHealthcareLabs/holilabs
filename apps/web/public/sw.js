/**
 * Service Worker for Push Notifications
 * 
 * Handles push notification events, notification clicks, and caching
 */

// Service worker version
const VERSION = '1.0.0';
const CACHE_NAME = `holilabs-cache-v${VERSION}`;

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker version:', VERSION);
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker version:', VERSION);
  event.waitUntil(clients.claim());
});

// Push notification received
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  if (!event.data) {
    console.log('[SW] Push event has no data');
    return;
  }

  let notification;
  try {
    notification = event.data.json();
  } catch (e) {
    notification = {
      title: 'Holi Labs',
      body: event.data.text(),
    };
  }

  const {
    title = 'Holi Labs',
    body = 'Nueva notificación',
    icon = '/icons/icon-192x192.png',
    badge = '/icons/badge-72x72.png',
    image,
    data = {},
    actions = [],
    tag,
    requireInteraction = false,
  } = notification;

  const notificationOptions = {
    body,
    icon,
    badge,
    image,
    data: {
      ...data,
      dateReceived: Date.now(),
    },
    actions,
    tag,
    requireInteraction,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(title, notificationOptions)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/portal/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }

      // If not, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background sync (future enhancement)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  // Future: Sync unread notifications in the background
  console.log('[SW] Syncing notifications...');
}

// Fetch event (for offline support)
self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip caching for API calls
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
