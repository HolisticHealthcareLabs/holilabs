'use client';

/**
 * Cookie Consent Banner Component
 *
 * @compliance GDPR Article 7, ePrivacy Directive, LGPD Article 10
 * @features
 * - Explicit consent for non-essential cookies
 * - Granular cookie preferences (Essential, Functional, Analytics)
 * - localStorage persistence
 * - GDPR-compliant consent withdrawal
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

type ConsentStatus = 'pending' | 'accepted' | 'rejected' | 'custom';
type CookiePreferences = {
  essential: boolean; // Always true, cannot be disabled
  functional: boolean;
  analytics: boolean;
  marketing: boolean; // Currently unused, but included for future
};

const DEFAULT_PREFERENCES: CookiePreferences = {
  essential: true,
  functional: false,
  analytics: false,
  marketing: false,
};

// Placeholder for analytics integration
const applyConsentToServices = (prefs: CookiePreferences) => {
  if (typeof window !== 'undefined') {
    console.log('[CookieConsent] Applying preferences:', prefs);
    // Future: Initialize Google Analytics, Hotjar, etc. here
  }
};

export function CookieConsentBanner() {
  const [consent, setConsent] = useState<ConsentStatus>('pending');
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);
  const bannerRef = useRef<HTMLDivElement | null>(null);

  const cssVarName = useMemo(() => '--holi-cookie-banner-h', []);

  const setCookieBannerHeightVar = (px: number) => {
    try {
      document.documentElement.style.setProperty(cssVarName, `${Math.max(0, Math.round(px))}px`);
    } catch {
      // ignore
    }
  };

  // Load consent from localStorage on mount
  useEffect(() => {
    const storedConsent = localStorage.getItem('cookieConsent');
    const storedPreferences = localStorage.getItem('cookiePreferences');

    if (storedConsent) {
      setConsent(storedConsent as ConsentStatus);
    }

    if (storedPreferences) {
      try {
        const parsed = JSON.parse(storedPreferences);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      } catch (error) {
        console.error('Failed to parse cookie preferences:', error);
      }
    }
  }, []);

  // Reserve space for the banner so it never overlaps content.
  useEffect(() => {
    if (consent !== 'pending') {
      setCookieBannerHeightVar(0);
      return;
    }

    const el = bannerRef.current;
    if (!el) return;

    const update = () => setCookieBannerHeightVar(el.getBoundingClientRect().height);
    update();

    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(() => update());
      ro.observe(el);
    } catch {
      // ignore (older browsers)
    }

    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      ro?.disconnect();
    };
  }, [consent]);

  // Handle consent actions
  const handleConsent = (status: ConsentStatus, customPreferences?: CookiePreferences) => {
    try {
      let finalPreferences: CookiePreferences;

      if (status === 'accepted') {
        // Accept all cookies
        finalPreferences = {
          essential: true,
          functional: true,
          analytics: true,
          marketing: false, // We don't use marketing cookies yet
        };
      } else if (status === 'rejected') {
        // Only essential cookies
        finalPreferences = DEFAULT_PREFERENCES;
      } else if (status === 'custom' && customPreferences) {
        // Custom preferences
        finalPreferences = { ...customPreferences, essential: true }; // Essential always true
      } else {
        finalPreferences = DEFAULT_PREFERENCES;
      }

      // Save to localStorage
      localStorage.setItem('cookieConsent', status);
      localStorage.setItem('cookiePreferences', JSON.stringify(finalPreferences));

      // Update state
      setConsent(status);
      setPreferences(finalPreferences);
      setShowPreferences(false);
      setCookieBannerHeightVar(0);

      // Apply consent to analytics/tracking services
      // Wrap in its own try-catch to prevent UI blocking
      try {
        applyConsentToServices(finalPreferences);
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { detail: finalPreferences }));
      } catch (e) {
        console.error("Analytics/Event error", e);
      }

    } catch (err) {
      // Fallback: Just hide the banner if something catastrophic happens
      console.error("Cookie banner critical error", err);
      setConsent(status);
    }
  };

  if (consent !== 'pending') return null;

  return (
    <div
      ref={bannerRef}
      className="fixed bottom-0 inset-x-0 bg-gray-900 text-white shadow-lg z-[100] border-t border-gray-700"
    >
      <div className="max-w-7xl mx-auto px-4 py-4 [@media(max-height:700px)]:py-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1 [@media(max-height:700px)]:hidden">We use cookies</h3>
            <p className="text-sm text-gray-300 [@media(max-height:700px)]:text-xs">
              We use cookies to improve your experience and analyze platform usage. Essential cookies are required
              for the platform to function.{' '}
              <Link href="/legal/cookie-policy" className="underline hover:text-white">
                Learn more
              </Link>
            </p>
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button
              onClick={() => handleConsent('accepted')}
              className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Accept All
            </button>
            <button
              onClick={() => handleConsent('rejected')}
              className="flex-1 md:flex-none bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Reject Non-Essential
            </button>
            <button
              onClick={() => setShowPreferences(true)}
              className="flex-1 md:flex-none bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-6 rounded-lg transition-colors border border-gray-600"
            >
              Customize
            </button>
          </div>
        </div>
      </div>

      {showPreferences && (
        <div
          className="fixed inset-0 z-[101] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowPreferences(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Cookie preferences</h3>
                <p className="text-sm text-gray-300 mt-1">
                  Essential cookies are always on. You can opt into functional and analytics cookies.
                </p>
              </div>
              <button
                className="text-gray-400 hover:text-white"
                onClick={() => setShowPreferences(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <label className="flex items-center justify-between gap-3 rounded-xl border border-gray-700 px-4 py-3">
                <div>
                  <div className="font-medium">Essential</div>
                  <div className="text-xs text-gray-400">Required for sign-in, security, and core features.</div>
                </div>
                <input type="checkbox" checked disabled className="h-5 w-5" />
              </label>

              <label className="flex items-center justify-between gap-3 rounded-xl border border-gray-700 px-4 py-3 hover:border-gray-600 transition-colors">
                <div>
                  <div className="font-medium">Functional</div>
                  <div className="text-xs text-gray-400">Remember preferences like theme and language.</div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.functional}
                  onChange={(e) => setPreferences((p) => ({ ...p, functional: e.target.checked }))}
                  className="h-5 w-5"
                />
              </label>

              <label className="flex items-center justify-between gap-3 rounded-xl border border-gray-700 px-4 py-3 hover:border-gray-600 transition-colors">
                <div>
                  <div className="font-medium">Analytics</div>
                  <div className="text-xs text-gray-400">Help us understand usage to improve the product.</div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(e) => setPreferences((p) => ({ ...p, analytics: e.target.checked }))}
                  className="h-5 w-5"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2">
              <button
                onClick={() => setShowPreferences(false)}
                className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors border border-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConsent('custom', preferences)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Save preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
