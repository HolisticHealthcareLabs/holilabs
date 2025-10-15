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
export const FeatureFlags = {
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
} as const;

export type FeatureFlagKey = typeof FeatureFlags[keyof typeof FeatureFlags];

/**
 * Default feature flag states
 * Used as fallback when PostHog is not available
 */
export const defaultFeatureFlags: Record<FeatureFlagKey, boolean> = {
  // AI Scribe Features (enabled for testing)
  [FeatureFlags.AI_SCRIBE_REAL_TIME]: true,
  [FeatureFlags.AI_SCRIBE_VOICE_COMMANDS]: true,
  [FeatureFlags.AI_SCRIBE_MULTILINGUAL]: false,
  [FeatureFlags.AI_SCRIBE_SMART_SUGGESTIONS]: true,

  // Clinical Notes (enabled)
  [FeatureFlags.CLINICAL_NOTES_TEMPLATES]: true,
  [FeatureFlags.CLINICAL_NOTES_AI_SUMMARY]: true,
  [FeatureFlags.CLINICAL_NOTES_BLOCKCHAIN]: true,

  // Patient Management (enabled)
  [FeatureFlags.PATIENT_SEARCH_ADVANCED]: true,
  [FeatureFlags.PATIENT_TIMELINE_VIEW]: true,
  [FeatureFlags.PATIENT_BULK_ACTIONS]: false,

  // Prescriptions & Medications
  [FeatureFlags.PRESCRIPTION_E_PRESCRIBE]: false,
  [FeatureFlags.PRESCRIPTION_DRUG_INTERACTIONS]: false,
  [FeatureFlags.PRESCRIPTION_FORMULARY_CHECK]: false,

  // Appointments
  [FeatureFlags.APPOINTMENTS_ONLINE_BOOKING]: false,
  [FeatureFlags.APPOINTMENTS_VIDEO_CALLS]: false,
  [FeatureFlags.APPOINTMENTS_REMINDERS]: true,

  // Documents
  [FeatureFlags.DOCUMENTS_OCR]: false,
  [FeatureFlags.DOCUMENTS_AI_EXTRACTION]: false,
  [FeatureFlags.DOCUMENTS_CLOUD_STORAGE]: true,

  // UI/UX Experiments
  [FeatureFlags.NEW_DASHBOARD_LAYOUT]: false,
  [FeatureFlags.DARK_MODE_DEFAULT]: false,
  [FeatureFlags.SIDEBAR_COLLAPSED_DEFAULT]: false,

  // Analytics & Insights
  [FeatureFlags.ANALYTICS_DASHBOARD]: true,
  [FeatureFlags.PERFORMANCE_METRICS]: true,
  [FeatureFlags.USAGE_INSIGHTS]: true,

  // Integration Features
  [FeatureFlags.INTEGRATION_WHATSAPP]: true,
  [FeatureFlags.INTEGRATION_TELEMEDICINE]: false,
  [FeatureFlags.INTEGRATION_LAB_RESULTS]: false,

  // Security & Compliance
  [FeatureFlags.TWO_FACTOR_AUTH]: false,
  [FeatureFlags.BIOMETRIC_AUTH]: false,
  [FeatureFlags.AUDIT_LOG_ADVANCED]: true,

  // Mobile Features
  [FeatureFlags.OFFLINE_MODE]: false,
  [FeatureFlags.PWA_PUSH_NOTIFICATIONS]: true,
  [FeatureFlags.MOBILE_QUICK_ACTIONS]: true,

  // Experimental
  [FeatureFlags.BETA_FEATURES]: false,
  [FeatureFlags.EXPERIMENTAL_UI]: false,
};

/**
 * Feature flag metadata for documentation
 */
export const featureFlagMetadata: Record<FeatureFlagKey, {
  name: string;
  description: string;
  category: string;
  risk: 'low' | 'medium' | 'high';
}> = {
  [FeatureFlags.AI_SCRIBE_REAL_TIME]: {
    name: 'Real-Time AI Scribe',
    description: 'Enable real-time transcription during consultations',
    category: 'AI Scribe',
    risk: 'medium',
  },
  [FeatureFlags.AI_SCRIBE_VOICE_COMMANDS]: {
    name: 'Voice Commands',
    description: 'Control the scribe with voice commands',
    category: 'AI Scribe',
    risk: 'low',
  },
  [FeatureFlags.AI_SCRIBE_MULTILINGUAL]: {
    name: 'Multilingual Support',
    description: 'Support for multiple languages in transcription',
    category: 'AI Scribe',
    risk: 'high',
  },
  [FeatureFlags.AI_SCRIBE_SMART_SUGGESTIONS]: {
    name: 'Smart Suggestions',
    description: 'AI-powered suggestions for clinical documentation',
    category: 'AI Scribe',
    risk: 'medium',
  },
  [FeatureFlags.CLINICAL_NOTES_TEMPLATES]: {
    name: 'Note Templates',
    description: 'Pre-built templates for common note types',
    category: 'Clinical Notes',
    risk: 'low',
  },
  [FeatureFlags.CLINICAL_NOTES_AI_SUMMARY]: {
    name: 'AI Summary',
    description: 'Automatically generate note summaries with AI',
    category: 'Clinical Notes',
    risk: 'medium',
  },
  [FeatureFlags.CLINICAL_NOTES_BLOCKCHAIN]: {
    name: 'Blockchain Verification',
    description: 'Verify note integrity with blockchain',
    category: 'Clinical Notes',
    risk: 'low',
  },
  [FeatureFlags.PATIENT_SEARCH_ADVANCED]: {
    name: 'Advanced Search',
    description: 'Enhanced patient search with filters and fuzzy matching',
    category: 'Patient Management',
    risk: 'low',
  },
  [FeatureFlags.PATIENT_TIMELINE_VIEW]: {
    name: 'Timeline View',
    description: 'Chronological timeline of patient encounters',
    category: 'Patient Management',
    risk: 'low',
  },
  [FeatureFlags.PATIENT_BULK_ACTIONS]: {
    name: 'Bulk Actions',
    description: 'Perform actions on multiple patients at once',
    category: 'Patient Management',
    risk: 'high',
  },
  [FeatureFlags.PRESCRIPTION_E_PRESCRIBE]: {
    name: 'E-Prescribe',
    description: 'Send prescriptions electronically to pharmacies',
    category: 'Prescriptions',
    risk: 'high',
  },
  [FeatureFlags.PRESCRIPTION_DRUG_INTERACTIONS]: {
    name: 'Drug Interactions',
    description: 'Check for drug interactions automatically',
    category: 'Prescriptions',
    risk: 'medium',
  },
  [FeatureFlags.PRESCRIPTION_FORMULARY_CHECK]: {
    name: 'Formulary Check',
    description: 'Check insurance formulary coverage',
    category: 'Prescriptions',
    risk: 'medium',
  },
  [FeatureFlags.APPOINTMENTS_ONLINE_BOOKING]: {
    name: 'Online Booking',
    description: 'Patients can book appointments online',
    category: 'Appointments',
    risk: 'medium',
  },
  [FeatureFlags.APPOINTMENTS_VIDEO_CALLS]: {
    name: 'Video Calls',
    description: 'Conduct video consultations',
    category: 'Appointments',
    risk: 'high',
  },
  [FeatureFlags.APPOINTMENTS_REMINDERS]: {
    name: 'Appointment Reminders',
    description: 'Send automated appointment reminders',
    category: 'Appointments',
    risk: 'low',
  },
  [FeatureFlags.DOCUMENTS_OCR]: {
    name: 'OCR',
    description: 'Extract text from document images',
    category: 'Documents',
    risk: 'medium',
  },
  [FeatureFlags.DOCUMENTS_AI_EXTRACTION]: {
    name: 'AI Extraction',
    description: 'Extract structured data from documents with AI',
    category: 'Documents',
    risk: 'high',
  },
  [FeatureFlags.DOCUMENTS_CLOUD_STORAGE]: {
    name: 'Cloud Storage',
    description: 'Store documents in the cloud',
    category: 'Documents',
    risk: 'medium',
  },
  [FeatureFlags.NEW_DASHBOARD_LAYOUT]: {
    name: 'New Dashboard Layout',
    description: 'A/B test new dashboard design',
    category: 'UI/UX',
    risk: 'low',
  },
  [FeatureFlags.DARK_MODE_DEFAULT]: {
    name: 'Dark Mode Default',
    description: 'Enable dark mode by default',
    category: 'UI/UX',
    risk: 'low',
  },
  [FeatureFlags.SIDEBAR_COLLAPSED_DEFAULT]: {
    name: 'Collapsed Sidebar',
    description: 'Collapse sidebar by default',
    category: 'UI/UX',
    risk: 'low',
  },
  [FeatureFlags.ANALYTICS_DASHBOARD]: {
    name: 'Analytics Dashboard',
    description: 'View usage analytics and insights',
    category: 'Analytics',
    risk: 'low',
  },
  [FeatureFlags.PERFORMANCE_METRICS]: {
    name: 'Performance Metrics',
    description: 'Track app performance metrics',
    category: 'Analytics',
    risk: 'low',
  },
  [FeatureFlags.USAGE_INSIGHTS]: {
    name: 'Usage Insights',
    description: 'Insights into feature usage',
    category: 'Analytics',
    risk: 'low',
  },
  [FeatureFlags.INTEGRATION_WHATSAPP]: {
    name: 'WhatsApp Integration',
    description: 'Send messages via WhatsApp',
    category: 'Integrations',
    risk: 'medium',
  },
  [FeatureFlags.INTEGRATION_TELEMEDICINE]: {
    name: 'Telemedicine',
    description: 'Integrated telemedicine platform',
    category: 'Integrations',
    risk: 'high',
  },
  [FeatureFlags.INTEGRATION_LAB_RESULTS]: {
    name: 'Lab Results',
    description: 'Import lab results automatically',
    category: 'Integrations',
    risk: 'high',
  },
  [FeatureFlags.TWO_FACTOR_AUTH]: {
    name: 'Two-Factor Authentication',
    description: 'Require 2FA for login',
    category: 'Security',
    risk: 'medium',
  },
  [FeatureFlags.BIOMETRIC_AUTH]: {
    name: 'Biometric Authentication',
    description: 'Login with fingerprint or Face ID',
    category: 'Security',
    risk: 'medium',
  },
  [FeatureFlags.AUDIT_LOG_ADVANCED]: {
    name: 'Advanced Audit Logs',
    description: 'Detailed audit logging with search',
    category: 'Security',
    risk: 'low',
  },
  [FeatureFlags.OFFLINE_MODE]: {
    name: 'Offline Mode',
    description: 'Work offline with local data sync',
    category: 'Mobile',
    risk: 'high',
  },
  [FeatureFlags.PWA_PUSH_NOTIFICATIONS]: {
    name: 'Push Notifications',
    description: 'Receive push notifications on mobile',
    category: 'Mobile',
    risk: 'low',
  },
  [FeatureFlags.MOBILE_QUICK_ACTIONS]: {
    name: 'Quick Actions',
    description: 'Quick action buttons on mobile',
    category: 'Mobile',
    risk: 'low',
  },
  [FeatureFlags.BETA_FEATURES]: {
    name: 'Beta Features',
    description: 'Access to beta features',
    category: 'Experimental',
    risk: 'high',
  },
  [FeatureFlags.EXPERIMENTAL_UI]: {
    name: 'Experimental UI',
    description: 'New experimental user interface',
    category: 'Experimental',
    risk: 'high',
  },
};
