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
export declare const initPostHog: () => void;
/**
 * Track a custom event
 * IMPORTANT: Never include PHI in event properties
 */
export declare const trackEvent: (eventName: string, properties?: Record<string, any>) => void;
/**
 * Track page views manually
 */
export declare const trackPageView: (pageName?: string) => void;
/**
 * Identify user (use anonymous ID or hashed ID, never PHI)
 */
export declare const identifyUser: (userId: string, traits?: Record<string, any>) => void;
/**
 * Reset user session (on logout)
 */
export declare const resetUser: () => void;
/**
 * Set user properties (non-PHI only)
 */
export declare const setUserProperties: (properties: Record<string, any>) => void;
/**
 * Feature flag evaluation
 */
export declare const isFeatureEnabled: (flagKey: string) => boolean;
/**
 * Get feature flag payload
 */
export declare const getFeatureFlagPayload: (flagKey: string) => any;
/**
 * Common events for tracking
 */
export declare const AnalyticsEvents: {
    readonly LOGIN: "user_login";
    readonly LOGOUT: "user_logout";
    readonly SIGNUP: "user_signup";
    readonly PAGE_VIEW: "page_view";
    readonly PATIENT_CREATED: "patient_created";
    readonly PATIENT_UPDATED: "patient_updated";
    readonly PATIENT_VIEWED: "patient_viewed";
    readonly PATIENT_SEARCHED: "patient_searched";
    readonly NOTE_CREATED: "clinical_note_created";
    readonly NOTE_UPDATED: "clinical_note_updated";
    readonly NOTE_VIEWED: "clinical_note_viewed";
    readonly NOTE_PRINTED: "clinical_note_printed";
    readonly SCRIBE_SESSION_STARTED: "scribe_session_started";
    readonly SCRIBE_SESSION_COMPLETED: "scribe_session_completed";
    readonly SCRIBE_RECORDING_STARTED: "scribe_recording_started";
    readonly SCRIBE_RECORDING_STOPPED: "scribe_recording_stopped";
    readonly SCRIBE_TRANSCRIPTION_GENERATED: "scribe_transcription_generated";
    readonly SCRIBE_SOAP_GENERATED: "scribe_soap_generated";
    readonly PRESCRIPTION_CREATED: "prescription_created";
    readonly PRESCRIPTION_SENT: "prescription_sent";
    readonly MEDICATION_ADDED: "medication_added";
    readonly APPOINTMENT_CREATED: "appointment_created";
    readonly APPOINTMENT_UPDATED: "appointment_updated";
    readonly APPOINTMENT_CANCELLED: "appointment_cancelled";
    readonly DOCUMENT_UPLOADED: "document_uploaded";
    readonly DOCUMENT_VIEWED: "document_viewed";
    readonly DOCUMENT_DOWNLOADED: "document_downloaded";
    readonly ERROR_OCCURRED: "error_occurred";
    readonly API_ERROR: "api_error";
    readonly BUTTON_CLICKED: "button_clicked";
    readonly MODAL_OPENED: "modal_opened";
    readonly MODAL_CLOSED: "modal_closed";
    readonly FILTER_APPLIED: "filter_applied";
    readonly SEARCH_PERFORMED: "search_performed";
    readonly PWA_INSTALLED: "pwa_installed";
    readonly PWA_PROMPT_SHOWN: "pwa_prompt_shown";
    readonly PWA_PROMPT_DISMISSED: "pwa_prompt_dismissed";
    readonly FEATURE_FLAG_EVALUATED: "feature_flag_evaluated";
};
export default posthog;
//# sourceMappingURL=posthog.d.ts.map