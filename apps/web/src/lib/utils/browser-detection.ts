/**
 * Browser Detection Utilities
 *
 * Detect browser type and version for applying browser-specific fixes
 * Use sparingly - prefer feature detection over browser detection
 */

export interface BrowserInfo {
  name: 'chrome' | 'firefox' | 'safari' | 'edge' | 'opera' | 'ie' | 'unknown';
  version: string;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  supportsWebRTC: boolean;
  supportsPushNotifications: boolean;
  supportsServiceWorker: boolean;
}

/**
 * Get comprehensive browser information
 */
export function getBrowserInfo(): BrowserInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      name: 'unknown',
      version: '0',
      isMobile: false,
      isIOS: false,
      isAndroid: false,
      supportsWebRTC: false,
      supportsPushNotifications: false,
      supportsServiceWorker: false,
    };
  }

  const ua = navigator.userAgent;
  let name: BrowserInfo['name'] = 'unknown';
  let version = '0';

  // Detect browser
  if (ua.includes('Firefox/')) {
    name = 'firefox';
    version = ua.match(/Firefox\/(\d+)/)?.[1] || '0';
  } else if (ua.includes('Edg/')) {
    name = 'edge';
    version = ua.match(/Edg\/(\d+)/)?.[1] || '0';
  } else if (ua.includes('Chrome/') && !ua.includes('Edg/')) {
    name = 'chrome';
    version = ua.match(/Chrome\/(\d+)/)?.[1] || '0';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome/')) {
    name = 'safari';
    version = ua.match(/Version\/(\d+)/)?.[1] || '0';
  } else if (ua.includes('Opera/') || ua.includes('OPR/')) {
    name = 'opera';
    version = ua.match(/(?:Opera|OPR)\/(\d+)/)?.[1] || '0';
  } else if (ua.includes('Trident/') || ua.includes('MSIE')) {
    name = 'ie';
    version = ua.match(/(?:MSIE |rv:)(\d+)/)?.[1] || '0';
  }

  const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  return {
    name,
    version,
    isMobile,
    isIOS,
    isAndroid,
    supportsWebRTC: hasWebRTCSupport(),
    supportsPushNotifications: hasPushNotificationSupport(),
    supportsServiceWorker: hasServiceWorkerSupport(),
  };
}

/**
 * Check if browser is Safari (desktop or iOS)
 */
export function isSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

/**
 * Check if browser is iOS Safari
 */
export function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS/.test(ua);
}

/**
 * Check if browser is Firefox
 */
export function isFirefox(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.userAgent.includes('Firefox/');
}

/**
 * Check if browser is Chrome
 */
export function isChrome(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return ua.includes('Chrome/') && !ua.includes('Edg/');
}

/**
 * Check if browser is Edge (Chromium)
 */
export function isEdge(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.userAgent.includes('Edg/');
}

/**
 * Check if device is mobile
 */
export function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

/**
 * Check if device is iOS
 */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * Check if device is Android
 */
export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

/**
 * Feature Detection: WebRTC Support
 */
export function hasWebRTCSupport(): boolean {
  if (typeof navigator === 'undefined') return false;
  return !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia
  );
}

/**
 * Feature Detection: Push Notification Support
 */
export function hasPushNotificationSupport(): boolean {
  if (typeof window === 'undefined') return false;
  // iOS Safari doesn't support Web Push
  if (isIOSSafari()) return false;
  return 'PushManager' in window && 'Notification' in window;
}

/**
 * Feature Detection: Service Worker Support
 */
export function hasServiceWorkerSupport(): boolean {
  if (typeof navigator === 'undefined') return false;
  return 'serviceWorker' in navigator;
}

/**
 * Feature Detection: WebSocket Support
 */
export function hasWebSocketSupport(): boolean {
  if (typeof window === 'undefined') return false;
  return 'WebSocket' in window;
}

/**
 * Feature Detection: LocalStorage Support
 */
export function hasLocalStorageSupport(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const test = '__localStorage_test__';
    window.localStorage.setItem(test, test);
    window.localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Feature Detection: IndexedDB Support
 */
export function hasIndexedDBSupport(): boolean {
  if (typeof window === 'undefined') return false;
  return 'indexedDB' in window;
}

/**
 * Feature Detection: Clipboard API Support
 */
export function hasClipboardSupport(): boolean {
  if (typeof navigator === 'undefined') return false;
  return 'clipboard' in navigator;
}

/**
 * Feature Detection: Screen Share Support
 */
export function hasScreenShareSupport(): boolean {
  if (typeof navigator === 'undefined') return false;
  // iOS doesn't support screen sharing
  if (isIOS()) return false;
  return !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getDisplayMedia
  );
}

/**
 * Get WebRTC constraints with browser-specific adjustments
 */
export function getWebRTCConstraints(options: {
  video?: boolean | MediaTrackConstraints;
  audio?: boolean | MediaTrackConstraints;
} = {}): MediaStreamConstraints {
  const constraints: MediaStreamConstraints = {
    video: options.video !== undefined ? options.video : true,
    audio: options.audio !== undefined ? options.audio : true,
  };

  // Safari-specific adjustments
  if (isSafari()) {
    if (typeof constraints.video === 'object') {
      constraints.video = {
        ...constraints.video,
        // Safari doesn't support some constraints
        facingMode: 'user',
      };
    }
  }

  // Add enhanced audio constraints for all browsers
  if (constraints.audio === true) {
    constraints.audio = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };
  }

  return constraints;
}

/**
 * Get date input format for current browser
 */
export function getDateInputFormat(): 'yyyy-MM-dd' | 'MM/dd/yyyy' | 'dd/MM/yyyy' {
  if (isSafari()) {
    // Safari uses ISO format
    return 'yyyy-MM-dd';
  }
  // Chrome/Firefox use ISO format
  return 'yyyy-MM-dd';
}

/**
 * Check if browser needs date input polyfill
 */
export function needsDatePickerPolyfill(): boolean {
  if (typeof document === 'undefined') return false;

  // Test if native date picker is supported
  const input = document.createElement('input');
  input.type = 'date';
  return input.type !== 'date';
}

/**
 * Apply browser-specific CSS class to document
 */
export function applyBrowserClass(): void {
  if (typeof document === 'undefined') return;

  const info = getBrowserInfo();
  const classes = [
    `browser-${info.name}`,
    info.isMobile ? 'is-mobile' : 'is-desktop',
    info.isIOS ? 'is-ios' : '',
    info.isAndroid ? 'is-android' : '',
  ].filter(Boolean);

  document.documentElement.classList.add(...classes);
}

/**
 * Get safe area insets for iOS
 */
export function getSafeAreaInsets(): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  if (typeof window === 'undefined' || !isIOS()) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const computedStyle = getComputedStyle(document.documentElement);

  return {
    top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0', 10),
    right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0', 10),
    bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10),
    left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0', 10),
  };
}

/**
 * Check if browser is in standalone PWA mode
 */
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;

  // Check iOS standalone
  if ('standalone' in window.navigator) {
    return (window.navigator as any).standalone === true;
  }

  // Check Android/Chrome standalone
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  return false;
}

/**
 * Get viewport height accounting for mobile browser chrome
 */
export function getViewportHeight(): number {
  if (typeof window === 'undefined') return 0;

  // Use visualViewport if available (more accurate on mobile)
  if (window.visualViewport) {
    return window.visualViewport.height;
  }

  return window.innerHeight;
}

/**
 * Set up viewport height CSS variable
 * Useful for mobile browsers where 100vh includes address bar
 */
export function setupViewportHeight(): void {
  if (typeof window === 'undefined') return;

  const setVH = () => {
    const vh = getViewportHeight() * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  setVH();
  window.addEventListener('resize', setVH);

  // Also listen to visualViewport if available
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', setVH);
  }
}

/**
 * Copy text to clipboard with browser compatibility
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Try modern Clipboard API first
  if (hasClipboardSupport()) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Clipboard API failed:', error);
    }
  }

  // Fallback to execCommand (deprecated but widely supported)
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch (error) {
    console.error('Fallback copy failed:', error);
    return false;
  }
}

/**
 * Request notification permission with proper handling
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!hasPushNotificationSupport()) {
    return 'denied';
  }

  try {
    return await Notification.requestPermission();
  } catch (error) {
    console.error('Notification permission request failed:', error);
    return 'denied';
  }
}

/**
 * Vibrate device (if supported)
 */
export function vibrate(pattern: number | number[]): boolean {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) {
    return false;
  }

  try {
    return navigator.vibrate(pattern);
  } catch (error) {
    return false;
  }
}
