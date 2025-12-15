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

import { useState, useEffect } from 'react';
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

export function CookieConsentBanner() {
  const [consent, setConsent] = useState<ConsentStatus>('pending');
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);

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

  // Handle consent actions
  const handleConsent = (status: ConsentStatus, customPreferences?: CookiePreferences) => {
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

    // Apply consent to analytics/tracking services
    applyConsentToServices(finalPreferences);

    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { detail: finalPreferences }));
  };

  // Apply consent to third-party services
  const applyConsentToServices = (prefs: CookiePreferences) => {
    // Google Analytics
    if (prefs.analytics) {
      // Enable Google Analytics
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('consent', 'update', {
          analytics_storage: 'granted',
        });
      }
    } else {
      // Disable Google Analytics
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('consent', 'update', {
          analytics_storage: 'denied',
        });
      }
    }

    // Add other service integrations here (e.g., Sentry, Mixpanel)
  };

  // Toggle preference
  const togglePreference = (key: keyof CookiePreferences) => {
    if (key === 'essential') return; // Essential cannot be toggled

    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Save custom preferences
  const saveCustomPreferences = () => {
    handleConsent('custom', preferences);
  };

  // Don't show banner if consent already given
  if (consent !== 'pending') return null;

  // Preferences modal
  if (showPreferences) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Cookie Preferences</h2>
              <button
                onClick={() => setShowPreferences(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close preferences"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We use cookies to improve your experience. You can choose which cookies you want to accept.
              For more information, see our{' '}
              <Link href="/legal/cookie-policy" className="text-blue-600 hover:underline">
                Cookie Policy
              </Link>.
            </p>

            <div className="space-y-4">
              {/* Essential Cookies */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">Essential Cookies</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Required for the platform to function</p>
                  </div>
                  <div className="flex items-center">
                    {/* Decorative - low contrast intentional for status text */}
                    <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Always Active</span>
                    <input
                      type="checkbox"
                      checked={true}
                      disabled
                      className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded cursor-not-allowed"
                    />
                  </div>
                </div>
                {/* Decorative - low contrast intentional for helper text */}
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  These cookies are necessary for authentication, security, and core platform functionality.
                  They cannot be disabled.
                </p>
              </div>

              {/* Functional Cookies */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">Functional Cookies</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Remember your preferences</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.functional}
                      onChange={() => togglePreference('functional')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                {/* Decorative - low contrast intentional for helper text */}
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  These cookies remember your language preference, theme (dark/light mode), and other settings.
                </p>
              </div>

              {/* Analytics Cookies */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">Analytics Cookies</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Help us improve the platform</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={() => togglePreference('analytics')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                {/* Decorative - low contrast intentional for helper text */}
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  These cookies help us understand how users interact with the platform using anonymized data.
                  No PHI is tracked.
                </p>
              </div>

              {/* Marketing Cookies (Disabled) */}
              <div className="border border-gray-200 rounded-lg p-4 opacity-50">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">Marketing Cookies</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Not currently used</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={false}
                    disabled
                    className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded cursor-not-allowed"
                  />
                </div>
                {/* Decorative - low contrast intentional for helper text */}
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  We do not use marketing or advertising cookies. This option is reserved for future use.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={saveCustomPreferences}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Save Preferences
              </button>
              <button
                onClick={() => handleConsent('accepted')}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main banner
  return (
    <div className="fixed bottom-0 inset-x-0 bg-gray-900 text-white shadow-lg z-30 border-t border-gray-700">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">We use cookies</h3>
            <p className="text-sm text-gray-300">
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
    </div>
  );
}
