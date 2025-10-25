"use strict";
/**
 * PostHog Analytics Configuration
 *
 * HIPAA-compliant analytics setup for healthcare application
 * - Disables autocapture to prevent PHI collection
 * - Manual event tracking only
 * - Session recording disabled by default
 * - Respects user consent
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsEvents = exports.getFeatureFlagPayload = exports.isFeatureEnabled = exports.setUserProperties = exports.resetUser = exports.identifyUser = exports.trackPageView = exports.trackEvent = exports.initPostHog = void 0;
const posthog_js_1 = __importDefault(require("posthog-js"));
const initPostHog = () => {
    if (typeof window === 'undefined')
        return;
    // Only initialize once
    if (posthog_js_1.default.__loaded)
        return;
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
    if (!apiKey) {
        // Only log in development mode to avoid console noise
        if (process.env.NODE_ENV === 'development') {
            console.info('ℹ️  PostHog analytics not configured (optional)');
        }
        return;
    }
    posthog_js_1.default.init(apiKey, {
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
exports.initPostHog = initPostHog;
/**
 * Track a custom event
 * IMPORTANT: Never include PHI in event properties
 */
const trackEvent = (eventName, properties) => {
    if (typeof window === 'undefined')
        return;
    if (!posthog_js_1.default.__loaded)
        return; // Silently skip if not initialized
    posthog_js_1.default.capture(eventName, properties);
};
exports.trackEvent = trackEvent;
/**
 * Track page views manually
 */
const trackPageView = (pageName) => {
    if (typeof window === 'undefined')
        return;
    if (!posthog_js_1.default.__loaded)
        return; // Silently skip if not initialized
    posthog_js_1.default.capture('$pageview', {
        page: pageName || window.location.pathname,
    });
};
exports.trackPageView = trackPageView;
/**
 * Identify user (use anonymous ID or hashed ID, never PHI)
 */
const identifyUser = (userId, traits) => {
    if (typeof window === 'undefined')
        return;
    if (!posthog_js_1.default.__loaded)
        return;
    // Use a hashed or anonymized user ID
    posthog_js_1.default.identify(userId, traits);
};
exports.identifyUser = identifyUser;
/**
 * Reset user session (on logout)
 */
const resetUser = () => {
    if (typeof window === 'undefined')
        return;
    if (!posthog_js_1.default.__loaded)
        return;
    posthog_js_1.default.reset();
};
exports.resetUser = resetUser;
/**
 * Set user properties (non-PHI only)
 */
const setUserProperties = (properties) => {
    if (typeof window === 'undefined')
        return;
    if (!posthog_js_1.default.__loaded)
        return;
    posthog_js_1.default.people.set(properties);
};
exports.setUserProperties = setUserProperties;
/**
 * Feature flag evaluation
 */
const isFeatureEnabled = (flagKey) => {
    if (typeof window === 'undefined')
        return false;
    if (!posthog_js_1.default.__loaded)
        return false;
    return posthog_js_1.default.isFeatureEnabled(flagKey) ?? false;
};
exports.isFeatureEnabled = isFeatureEnabled;
/**
 * Get feature flag payload
 */
const getFeatureFlagPayload = (flagKey) => {
    if (typeof window === 'undefined')
        return null;
    if (!posthog_js_1.default.__loaded)
        return null;
    return posthog_js_1.default.getFeatureFlagPayload(flagKey);
};
exports.getFeatureFlagPayload = getFeatureFlagPayload;
/**
 * Common events for tracking
 */
exports.AnalyticsEvents = {
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
};
exports.default = posthog_js_1.default;
//# sourceMappingURL=posthog.js.map