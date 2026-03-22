/**
 * Service Worker Registration Helper
 * Utilities for registering and managing the offline-sync service worker
 */

/**
 * Service worker registration options
 */
export interface SWRegistrationOptions {
  /** Path to service worker script */
  scriptPath: string;

  /** Service worker scope (default: '/') */
  scope?: string;

  /** Update check interval in ms (default: 60000) */
  updateCheckIntervalMs?: number;

  /** Callback on registration success */
  onSuccess?: (registration: ServiceWorkerRegistration) => void;

  /** Callback on registration error */
  onError?: (error: Error) => void;

  /** Callback when service worker updates */
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
}

/**
 * Register the offline-sync service worker
 */
export async function registerServiceWorker(options: SWRegistrationOptions): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) {
    console.warn('Service Workers not supported in this browser');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(options.scriptPath, {
      scope: options.scope ?? '/',
    });

    console.log('Service Worker registered:', registration);

    if (options.onSuccess) {
      options.onSuccess(registration);
    }

    // Check for updates periodically
    const updateCheckInterval = options.updateCheckIntervalMs ?? 60000;
    setInterval(() => {
      registration.update().catch((error) => {
        console.warn('Service Worker update check failed:', error);
      });
    }, updateCheckInterval);

    // Listen for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('New Service Worker available');
          if (options.onUpdate) {
            options.onUpdate(registration);
          }
        }
      });
    });

    return registration;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('Service Worker registration failed:', err);

    if (options.onError) {
      options.onError(err);
    }

    return null;
  }
}

/**
 * Unregister the service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) {
    return false;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
    console.log('Service Worker unregistered');
    return true;
  } catch (error) {
    console.error('Service Worker unregistration failed:', error);
    return false;
  }
}

/**
 * Check if service worker is registered
 */
export async function isServiceWorkerRegistered(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) {
    return false;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    return registrations.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Get current service worker registration
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) {
    return null;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    return registrations.length > 0 ? registrations[0] : null;
  } catch (error) {
    return null;
  }
}

/**
 * Send message to service worker
 */
export async function sendMessageToServiceWorker(message: unknown): Promise<unknown> {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker.controller) {
    throw new Error('No active Service Worker');
  }

  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();

    channel.port1.onmessage = (event) => {
      resolve(event.data);
    };

    navigator.serviceWorker.controller.postMessage(message, [channel.port2]);

    // Timeout after 5 seconds
    setTimeout(() => {
      reject(new Error('Service Worker message timeout'));
    }, 5000);
  });
}

/**
 * Listen for messages from service worker
 */
export function listenToServiceWorker(
  handler: (message: unknown) => void,
): () => void {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) {
    return () => {};
  }

  const listener = (event: MessageEvent) => {
    handler(event.data);
  };

  navigator.serviceWorker.addEventListener('message', listener);

  // Return unsubscribe function
  return () => {
    navigator.serviceWorker.removeEventListener('message', listener);
  };
}

/**
 * Detect network status changes
 */
export function detectNetworkStatus(
  onOnline?: () => void,
  onOffline?: () => void,
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleOnline = () => {
    console.log('Network: ONLINE');
    if (onOnline) onOnline();
  };

  const handleOffline = () => {
    console.log('Network: OFFLINE');
    if (onOffline) onOffline();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Return unsubscribe function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Check if browser is currently online
 */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine ?? true;
}

/**
 * Initialize offline-sync service worker
 * Complete setup with registration, network detection, and sync queue processing
 */
export async function initializeOfflineSync(options: SWRegistrationOptions & {
  onOnline?: () => void;
  onOffline?: () => void;
}): Promise<ServiceWorkerRegistration | null> {
  // Register service worker
  const registration = await registerServiceWorker(options);

  if (!registration) {
    console.warn('Failed to register service worker, offline functionality disabled');
    return null;
  }

  // Detect network changes
  detectNetworkStatus(options.onOnline, options.onOffline);

  return registration;
}
