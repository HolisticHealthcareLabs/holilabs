"use strict";
/**
 * Feature Flags Configuration
 *
 * Centralized feature flag definitions for A/B testing and gradual rollouts
 * Powered by PostHog feature flags
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.featureFlagMetadata = exports.defaultFeatureFlags = exports.FeatureFlags = void 0;
/**
 * Feature Flag Keys
 *
 * Define all feature flags here for type safety and discoverability
 */
exports.FeatureFlags = {
    // AI Scribe Features
    AI_SCRIBE_REAL_TIME: 'ai-scribe-real-time',
    AI_SCRIBE_VOICE_COMMANDS: 'ai-scribe-voice-commands',
    AI_SCRIBE_MULTILINGUAL: 'ai-scribe-multilingual',
    AI_SCRIBE_SMART_SUGGESTIONS: 'ai-scribe-smart-suggestions',
    // Clinical Notes
    CLINICAL_NOTES_TEMPLATES: 'clinical-notes-templates',
    CLINICAL_NOTES_AI_SUMMARY: 'clinical-notes-ai-summary',
    CLINICAL_NOTES_BLOCKCHAIN: 'clinical-notes-blockchain',
    // Patient Management
    PATIENT_SEARCH_ADVANCED: 'patient-search-advanced',
    PATIENT_TIMELINE_VIEW: 'patient-timeline-view',
    PATIENT_BULK_ACTIONS: 'patient-bulk-actions',
    // Prescriptions & Medications
    PRESCRIPTION_E_PRESCRIBE: 'prescription-e-prescribe',
    PRESCRIPTION_DRUG_INTERACTIONS: 'prescription-drug-interactions',
    PRESCRIPTION_FORMULARY_CHECK: 'prescription-formulary-check',
    // Appointments
    APPOINTMENTS_ONLINE_BOOKING: 'appointments-online-booking',
    APPOINTMENTS_VIDEO_CALLS: 'appointments-video-calls',
    APPOINTMENTS_REMINDERS: 'appointments-reminders',
    // Documents
    DOCUMENTS_OCR: 'documents-ocr',
    DOCUMENTS_AI_EXTRACTION: 'documents-ai-extraction',
    DOCUMENTS_CLOUD_STORAGE: 'documents-cloud-storage',
    // UI/UX Experiments
    NEW_DASHBOARD_LAYOUT: 'new-dashboard-layout',
    DARK_MODE_DEFAULT: 'dark-mode-default',
    SIDEBAR_COLLAPSED_DEFAULT: 'sidebar-collapsed-default',
    // Analytics & Insights
    ANALYTICS_DASHBOARD: 'analytics-dashboard',
    PERFORMANCE_METRICS: 'performance-metrics',
    USAGE_INSIGHTS: 'usage-insights',
    // Integration Features
    INTEGRATION_WHATSAPP: 'integration-whatsapp',
    INTEGRATION_TELEMEDICINE: 'integration-telemedicine',
    INTEGRATION_LAB_RESULTS: 'integration-lab-results',
    // Security & Compliance
    TWO_FACTOR_AUTH: 'two-factor-auth',
    BIOMETRIC_AUTH: 'biometric-auth',
    AUDIT_LOG_ADVANCED: 'audit-log-advanced',
    // Mobile Features
    OFFLINE_MODE: 'offline-mode',
    PWA_PUSH_NOTIFICATIONS: 'pwa-push-notifications',
    MOBILE_QUICK_ACTIONS: 'mobile-quick-actions',
    // Experimental
    BETA_FEATURES: 'beta-features',
    EXPERIMENTAL_UI: 'experimental-ui',
};
/**
 * Default feature flag states
 * Used as fallback when PostHog is not available
 */
exports.defaultFeatureFlags = {
    // AI Scribe Features (enabled for testing)
    [exports.FeatureFlags.AI_SCRIBE_REAL_TIME]: true,
    [exports.FeatureFlags.AI_SCRIBE_VOICE_COMMANDS]: true,
    [exports.FeatureFlags.AI_SCRIBE_MULTILINGUAL]: false,
    [exports.FeatureFlags.AI_SCRIBE_SMART_SUGGESTIONS]: true,
    // Clinical Notes (enabled)
    [exports.FeatureFlags.CLINICAL_NOTES_TEMPLATES]: true,
    [exports.FeatureFlags.CLINICAL_NOTES_AI_SUMMARY]: true,
    [exports.FeatureFlags.CLINICAL_NOTES_BLOCKCHAIN]: true,
    // Patient Management (enabled)
    [exports.FeatureFlags.PATIENT_SEARCH_ADVANCED]: true,
    [exports.FeatureFlags.PATIENT_TIMELINE_VIEW]: true,
    [exports.FeatureFlags.PATIENT_BULK_ACTIONS]: false,
    // Prescriptions & Medications
    [exports.FeatureFlags.PRESCRIPTION_E_PRESCRIBE]: false,
    [exports.FeatureFlags.PRESCRIPTION_DRUG_INTERACTIONS]: false,
    [exports.FeatureFlags.PRESCRIPTION_FORMULARY_CHECK]: false,
    // Appointments
    [exports.FeatureFlags.APPOINTMENTS_ONLINE_BOOKING]: false,
    [exports.FeatureFlags.APPOINTMENTS_VIDEO_CALLS]: false,
    [exports.FeatureFlags.APPOINTMENTS_REMINDERS]: true,
    // Documents
    [exports.FeatureFlags.DOCUMENTS_OCR]: false,
    [exports.FeatureFlags.DOCUMENTS_AI_EXTRACTION]: false,
    [exports.FeatureFlags.DOCUMENTS_CLOUD_STORAGE]: true,
    // UI/UX Experiments
    [exports.FeatureFlags.NEW_DASHBOARD_LAYOUT]: false,
    [exports.FeatureFlags.DARK_MODE_DEFAULT]: false,
    [exports.FeatureFlags.SIDEBAR_COLLAPSED_DEFAULT]: false,
    // Analytics & Insights
    [exports.FeatureFlags.ANALYTICS_DASHBOARD]: true,
    [exports.FeatureFlags.PERFORMANCE_METRICS]: true,
    [exports.FeatureFlags.USAGE_INSIGHTS]: true,
    // Integration Features
    [exports.FeatureFlags.INTEGRATION_WHATSAPP]: true,
    [exports.FeatureFlags.INTEGRATION_TELEMEDICINE]: false,
    [exports.FeatureFlags.INTEGRATION_LAB_RESULTS]: false,
    // Security & Compliance
    [exports.FeatureFlags.TWO_FACTOR_AUTH]: false,
    [exports.FeatureFlags.BIOMETRIC_AUTH]: false,
    [exports.FeatureFlags.AUDIT_LOG_ADVANCED]: true,
    // Mobile Features
    [exports.FeatureFlags.OFFLINE_MODE]: false,
    [exports.FeatureFlags.PWA_PUSH_NOTIFICATIONS]: true,
    [exports.FeatureFlags.MOBILE_QUICK_ACTIONS]: true,
    // Experimental
    [exports.FeatureFlags.BETA_FEATURES]: false,
    [exports.FeatureFlags.EXPERIMENTAL_UI]: false,
};
/**
 * Feature flag metadata for documentation
 */
exports.featureFlagMetadata = {
    [exports.FeatureFlags.AI_SCRIBE_REAL_TIME]: {
        name: 'Real-Time AI Scribe',
        description: 'Enable real-time transcription during consultations',
        category: 'AI Scribe',
        risk: 'medium',
    },
    [exports.FeatureFlags.AI_SCRIBE_VOICE_COMMANDS]: {
        name: 'Voice Commands',
        description: 'Control the scribe with voice commands',
        category: 'AI Scribe',
        risk: 'low',
    },
    [exports.FeatureFlags.AI_SCRIBE_MULTILINGUAL]: {
        name: 'Multilingual Support',
        description: 'Support for multiple languages in transcription',
        category: 'AI Scribe',
        risk: 'high',
    },
    [exports.FeatureFlags.AI_SCRIBE_SMART_SUGGESTIONS]: {
        name: 'Smart Suggestions',
        description: 'AI-powered suggestions for clinical documentation',
        category: 'AI Scribe',
        risk: 'medium',
    },
    [exports.FeatureFlags.CLINICAL_NOTES_TEMPLATES]: {
        name: 'Note Templates',
        description: 'Pre-built templates for common note types',
        category: 'Clinical Notes',
        risk: 'low',
    },
    [exports.FeatureFlags.CLINICAL_NOTES_AI_SUMMARY]: {
        name: 'AI Summary',
        description: 'Automatically generate note summaries with AI',
        category: 'Clinical Notes',
        risk: 'medium',
    },
    [exports.FeatureFlags.CLINICAL_NOTES_BLOCKCHAIN]: {
        name: 'Blockchain Verification',
        description: 'Verify note integrity with blockchain',
        category: 'Clinical Notes',
        risk: 'low',
    },
    [exports.FeatureFlags.PATIENT_SEARCH_ADVANCED]: {
        name: 'Advanced Search',
        description: 'Enhanced patient search with filters and fuzzy matching',
        category: 'Patient Management',
        risk: 'low',
    },
    [exports.FeatureFlags.PATIENT_TIMELINE_VIEW]: {
        name: 'Timeline View',
        description: 'Chronological timeline of patient encounters',
        category: 'Patient Management',
        risk: 'low',
    },
    [exports.FeatureFlags.PATIENT_BULK_ACTIONS]: {
        name: 'Bulk Actions',
        description: 'Perform actions on multiple patients at once',
        category: 'Patient Management',
        risk: 'high',
    },
    [exports.FeatureFlags.PRESCRIPTION_E_PRESCRIBE]: {
        name: 'E-Prescribe',
        description: 'Send prescriptions electronically to pharmacies',
        category: 'Prescriptions',
        risk: 'high',
    },
    [exports.FeatureFlags.PRESCRIPTION_DRUG_INTERACTIONS]: {
        name: 'Drug Interactions',
        description: 'Check for drug interactions automatically',
        category: 'Prescriptions',
        risk: 'medium',
    },
    [exports.FeatureFlags.PRESCRIPTION_FORMULARY_CHECK]: {
        name: 'Formulary Check',
        description: 'Check insurance formulary coverage',
        category: 'Prescriptions',
        risk: 'medium',
    },
    [exports.FeatureFlags.APPOINTMENTS_ONLINE_BOOKING]: {
        name: 'Online Booking',
        description: 'Patients can book appointments online',
        category: 'Appointments',
        risk: 'medium',
    },
    [exports.FeatureFlags.APPOINTMENTS_VIDEO_CALLS]: {
        name: 'Video Calls',
        description: 'Conduct video consultations',
        category: 'Appointments',
        risk: 'high',
    },
    [exports.FeatureFlags.APPOINTMENTS_REMINDERS]: {
        name: 'Appointment Reminders',
        description: 'Send automated appointment reminders',
        category: 'Appointments',
        risk: 'low',
    },
    [exports.FeatureFlags.DOCUMENTS_OCR]: {
        name: 'OCR',
        description: 'Extract text from document images',
        category: 'Documents',
        risk: 'medium',
    },
    [exports.FeatureFlags.DOCUMENTS_AI_EXTRACTION]: {
        name: 'AI Extraction',
        description: 'Extract structured data from documents with AI',
        category: 'Documents',
        risk: 'high',
    },
    [exports.FeatureFlags.DOCUMENTS_CLOUD_STORAGE]: {
        name: 'Cloud Storage',
        description: 'Store documents in the cloud',
        category: 'Documents',
        risk: 'medium',
    },
    [exports.FeatureFlags.NEW_DASHBOARD_LAYOUT]: {
        name: 'New Dashboard Layout',
        description: 'A/B test new dashboard design',
        category: 'UI/UX',
        risk: 'low',
    },
    [exports.FeatureFlags.DARK_MODE_DEFAULT]: {
        name: 'Dark Mode Default',
        description: 'Enable dark mode by default',
        category: 'UI/UX',
        risk: 'low',
    },
    [exports.FeatureFlags.SIDEBAR_COLLAPSED_DEFAULT]: {
        name: 'Collapsed Sidebar',
        description: 'Collapse sidebar by default',
        category: 'UI/UX',
        risk: 'low',
    },
    [exports.FeatureFlags.ANALYTICS_DASHBOARD]: {
        name: 'Analytics Dashboard',
        description: 'View usage analytics and insights',
        category: 'Analytics',
        risk: 'low',
    },
    [exports.FeatureFlags.PERFORMANCE_METRICS]: {
        name: 'Performance Metrics',
        description: 'Track app performance metrics',
        category: 'Analytics',
        risk: 'low',
    },
    [exports.FeatureFlags.USAGE_INSIGHTS]: {
        name: 'Usage Insights',
        description: 'Insights into feature usage',
        category: 'Analytics',
        risk: 'low',
    },
    [exports.FeatureFlags.INTEGRATION_WHATSAPP]: {
        name: 'WhatsApp Integration',
        description: 'Send messages via WhatsApp',
        category: 'Integrations',
        risk: 'medium',
    },
    [exports.FeatureFlags.INTEGRATION_TELEMEDICINE]: {
        name: 'Telemedicine',
        description: 'Integrated telemedicine platform',
        category: 'Integrations',
        risk: 'high',
    },
    [exports.FeatureFlags.INTEGRATION_LAB_RESULTS]: {
        name: 'Lab Results',
        description: 'Import lab results automatically',
        category: 'Integrations',
        risk: 'high',
    },
    [exports.FeatureFlags.TWO_FACTOR_AUTH]: {
        name: 'Two-Factor Authentication',
        description: 'Require 2FA for login',
        category: 'Security',
        risk: 'medium',
    },
    [exports.FeatureFlags.BIOMETRIC_AUTH]: {
        name: 'Biometric Authentication',
        description: 'Login with fingerprint or Face ID',
        category: 'Security',
        risk: 'medium',
    },
    [exports.FeatureFlags.AUDIT_LOG_ADVANCED]: {
        name: 'Advanced Audit Logs',
        description: 'Detailed audit logging with search',
        category: 'Security',
        risk: 'low',
    },
    [exports.FeatureFlags.OFFLINE_MODE]: {
        name: 'Offline Mode',
        description: 'Work offline with local data sync',
        category: 'Mobile',
        risk: 'high',
    },
    [exports.FeatureFlags.PWA_PUSH_NOTIFICATIONS]: {
        name: 'Push Notifications',
        description: 'Receive push notifications on mobile',
        category: 'Mobile',
        risk: 'low',
    },
    [exports.FeatureFlags.MOBILE_QUICK_ACTIONS]: {
        name: 'Quick Actions',
        description: 'Quick action buttons on mobile',
        category: 'Mobile',
        risk: 'low',
    },
    [exports.FeatureFlags.BETA_FEATURES]: {
        name: 'Beta Features',
        description: 'Access to beta features',
        category: 'Experimental',
        risk: 'high',
    },
    [exports.FeatureFlags.EXPERIMENTAL_UI]: {
        name: 'Experimental UI',
        description: 'New experimental user interface',
        category: 'Experimental',
        risk: 'high',
    },
};
//# sourceMappingURL=featureFlags.js.map