/**
 * PostHog Analytics Configuration
 *
 * HIPAA-compliant analytics setup for healthcare application
 * - Disables autocapture to prevent PHI collection
 * - Manual event tracking only
 * - Session recording disabled by default
 * - Respects user consent
 */

import posthog from 'posthog-js';

export const initPostHog = () => {
  if (typeof window === 'undefined') return;

  // Only initialize once
  if (posthog.__loaded) return;

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (!apiKey) {
    // Only log in development mode to avoid console noise
    if (process.env.NODE_ENV === 'development') {
      console.info('ℹ️  PostHog analytics not configured (optional)');
    }
    return;
  }

  posthog.init(apiKey, {
    api_host: apiHost,

    // HIPAA Compliance: Disable automatic data collection
    autocapture: false,
    capture_pageview: false, // Manual pageview tracking
    capture_pageleave: false,

    // Session Recording: Disabled by default
    disable_session_recording: true,

    // Privacy Settings
    respect_dnt: true,
    opt_out_capturing_by_default: false,

    // Performance
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') {
        posthog.debug();
      }
    },

    // Persistence
    persistence: 'localStorage',

    // Advanced Settings
    sanitize_properties: (properties, event) => {
      // Remove any potential PHI from properties
      const sanitized = { ...properties };
      const sensitiveKeys = [
        'email', 'phone', 'cpf', 'cns', 'dateOfBirth',
        'patientId', 'patientName', 'diagnosis', 'medication',
        'firstName', 'lastName', 'address', 'ssn'
      ];

      sensitiveKeys.forEach(key => {
        if (key in sanitized) {
          delete sanitized[key];
        }
      });

      return sanitized;
    },
  });
};

/**
 * Track a custom event
 * IMPORTANT: Never include PHI in event properties
 */
export const trackEvent = (
  eventName: string,
  properties?: Record<string, any>
) => {
  if (typeof window === 'undefined') return;
  if (!posthog.__loaded) return; // Silently skip if not initialized

  posthog.capture(eventName, properties);
};

/**
 * Track page views manually
 */
export const trackPageView = (pageName?: string) => {
  if (typeof window === 'undefined') return;
  if (!posthog.__loaded) return; // Silently skip if not initialized

  posthog.capture('$pageview', {
    page: pageName || window.location.pathname,
  });
};

/**
 * Identify user (use anonymous ID or hashed ID, never PHI)
 */
export const identifyUser = (userId: string, traits?: Record<string, any>) => {
  if (typeof window === 'undefined') return;
  if (!posthog.__loaded) return;

  // Use a hashed or anonymized user ID
  posthog.identify(userId, traits);
};

/**
 * Reset user session (on logout)
 */
export const resetUser = () => {
  if (typeof window === 'undefined') return;
  if (!posthog.__loaded) return;

  posthog.reset();
};

/**
 * Set user properties (non-PHI only)
 */
export const setUserProperties = (properties: Record<string, any>) => {
  if (typeof window === 'undefined') return;
  if (!posthog.__loaded) return;

  posthog.people.set(properties);
};

/**
 * Feature flag evaluation
 */
export const isFeatureEnabled = (flagKey: string): boolean => {
  if (typeof window === 'undefined') return false;
  if (!posthog.__loaded) return false;

  return posthog.isFeatureEnabled(flagKey) ?? false;
};

/**
 * Get feature flag payload
 */
export const getFeatureFlagPayload = (flagKey: string): any => {
  if (typeof window === 'undefined') return null;
  if (!posthog.__loaded) return null;

  return posthog.getFeatureFlagPayload(flagKey);
};

/**
 * Common events for tracking
 */
export const AnalyticsEvents = {
  // Authentication
  LOGIN: 'user_login',
  LOGOUT: 'user_logout',
  SIGNUP: 'user_signup',

  // Navigation
  PAGE_VIEW: 'page_view',

  // Patient Management (No PHI in properties!)
  PATIENT_CREATED: 'patient_created',
  PATIENT_UPDATED: 'patient_updated',
  PATIENT_VIEWED: 'patient_viewed',
  PATIENT_SEARCHED: 'patient_searched',

  // Clinical Notes
  NOTE_CREATED: 'clinical_note_created',
  NOTE_UPDATED: 'clinical_note_updated',
  NOTE_VIEWED: 'clinical_note_viewed',
  NOTE_PRINTED: 'clinical_note_printed',

  // AI Scribe
  SCRIBE_SESSION_STARTED: 'scribe_session_started',
  SCRIBE_SESSION_COMPLETED: 'scribe_session_completed',
  SCRIBE_RECORDING_STARTED: 'scribe_recording_started',
  SCRIBE_RECORDING_STOPPED: 'scribe_recording_stopped',
  SCRIBE_TRANSCRIPTION_GENERATED: 'scribe_transcription_generated',
  SCRIBE_SOAP_GENERATED: 'scribe_soap_generated',

  // Prescriptions & Medications
  PRESCRIPTION_CREATED: 'prescription_created',
  PRESCRIPTION_SENT: 'prescription_sent',
  MEDICATION_ADDED: 'medication_added',

  // Appointments
  APPOINTMENT_CREATED: 'appointment_created',
  APPOINTMENT_UPDATED: 'appointment_updated',
  APPOINTMENT_CANCELLED: 'appointment_cancelled',

  // Documents
  DOCUMENT_UPLOADED: 'document_uploaded',
  DOCUMENT_VIEWED: 'document_viewed',
  DOCUMENT_DOWNLOADED: 'document_downloaded',

  // Errors & Issues
  ERROR_OCCURRED: 'error_occurred',
  API_ERROR: 'api_error',

  // UI Interactions
  BUTTON_CLICKED: 'button_clicked',
  MODAL_OPENED: 'modal_opened',
  MODAL_CLOSED: 'modal_closed',
  FILTER_APPLIED: 'filter_applied',
  SEARCH_PERFORMED: 'search_performed',

  // PWA
  PWA_INSTALLED: 'pwa_installed',
  PWA_PROMPT_SHOWN: 'pwa_prompt_shown',
  PWA_PROMPT_DISMISSED: 'pwa_prompt_dismissed',

  // Feature Flags
  FEATURE_FLAG_EVALUATED: 'feature_flag_evaluated',
} as const;

export default posthog;
