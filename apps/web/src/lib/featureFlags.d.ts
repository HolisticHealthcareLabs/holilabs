/**
 * Feature Flags Configuration
 *
 * Centralized feature flag definitions for A/B testing and gradual rollouts
 * Powered by PostHog feature flags
 */
/**
 * Feature Flag Keys
 *
 * Define all feature flags here for type safety and discoverability
 */
export declare const FeatureFlags: {
    readonly AI_SCRIBE_REAL_TIME: "ai-scribe-real-time";
    readonly AI_SCRIBE_VOICE_COMMANDS: "ai-scribe-voice-commands";
    readonly AI_SCRIBE_MULTILINGUAL: "ai-scribe-multilingual";
    readonly AI_SCRIBE_SMART_SUGGESTIONS: "ai-scribe-smart-suggestions";
    readonly CLINICAL_NOTES_TEMPLATES: "clinical-notes-templates";
    readonly CLINICAL_NOTES_AI_SUMMARY: "clinical-notes-ai-summary";
    readonly CLINICAL_NOTES_BLOCKCHAIN: "clinical-notes-blockchain";
    readonly PATIENT_SEARCH_ADVANCED: "patient-search-advanced";
    readonly PATIENT_TIMELINE_VIEW: "patient-timeline-view";
    readonly PATIENT_BULK_ACTIONS: "patient-bulk-actions";
    readonly PRESCRIPTION_E_PRESCRIBE: "prescription-e-prescribe";
    readonly PRESCRIPTION_DRUG_INTERACTIONS: "prescription-drug-interactions";
    readonly PRESCRIPTION_FORMULARY_CHECK: "prescription-formulary-check";
    readonly APPOINTMENTS_ONLINE_BOOKING: "appointments-online-booking";
    readonly APPOINTMENTS_VIDEO_CALLS: "appointments-video-calls";
    readonly APPOINTMENTS_REMINDERS: "appointments-reminders";
    readonly DOCUMENTS_OCR: "documents-ocr";
    readonly DOCUMENTS_AI_EXTRACTION: "documents-ai-extraction";
    readonly DOCUMENTS_CLOUD_STORAGE: "documents-cloud-storage";
    readonly NEW_DASHBOARD_LAYOUT: "new-dashboard-layout";
    readonly DARK_MODE_DEFAULT: "dark-mode-default";
    readonly SIDEBAR_COLLAPSED_DEFAULT: "sidebar-collapsed-default";
    readonly ANALYTICS_DASHBOARD: "analytics-dashboard";
    readonly PERFORMANCE_METRICS: "performance-metrics";
    readonly USAGE_INSIGHTS: "usage-insights";
    readonly INTEGRATION_WHATSAPP: "integration-whatsapp";
    readonly INTEGRATION_TELEMEDICINE: "integration-telemedicine";
    readonly INTEGRATION_LAB_RESULTS: "integration-lab-results";
    readonly TWO_FACTOR_AUTH: "two-factor-auth";
    readonly BIOMETRIC_AUTH: "biometric-auth";
    readonly AUDIT_LOG_ADVANCED: "audit-log-advanced";
    readonly OFFLINE_MODE: "offline-mode";
    readonly PWA_PUSH_NOTIFICATIONS: "pwa-push-notifications";
    readonly MOBILE_QUICK_ACTIONS: "mobile-quick-actions";
    readonly BETA_FEATURES: "beta-features";
    readonly EXPERIMENTAL_UI: "experimental-ui";
};
export type FeatureFlagKey = typeof FeatureFlags[keyof typeof FeatureFlags];
/**
 * Default feature flag states
 * Used as fallback when PostHog is not available
 */
export declare const defaultFeatureFlags: Record<FeatureFlagKey, boolean>;
/**
 * Feature flag metadata for documentation
 */
export declare const featureFlagMetadata: Record<FeatureFlagKey, {
    name: string;
    description: string;
    category: string;
    risk: 'low' | 'medium' | 'high';
}>;
//# sourceMappingURL=featureFlags.d.ts.map