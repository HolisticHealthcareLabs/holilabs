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

  // ... (rest of component)

  // Main banner
  // UPDATED Z-INDEX TO 100
  return (
    <div className="fixed bottom-0 inset-x-0 bg-gray-900 text-white shadow-lg z-[100] border-t border-gray-700">
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
