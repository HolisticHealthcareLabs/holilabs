import Constants from 'expo-constants';

// Get environment variables from app.json extra field or process.env
const getEnvVar = (key: string, defaultValue: string = ''): string => {
  // Try to get from Expo Constants first
  const value = Constants.expoConfig?.extra?.[key];
  if (value) return value;

  // Fallback to hardcoded defaults for development
  const defaults: Record<string, string> = {
    API_URL: 'https://holilabs-lwp6y.ondigitalocean.app/api',
    API_TIMEOUT: '30000',
    ANTHROPIC_API_KEY: '',
  };

  return defaults[key] || defaultValue;
};

export const API_CONFIG = {
  BASE_URL: getEnvVar('API_URL', 'http://localhost:3001'),
  TIMEOUT: parseInt(getEnvVar('API_TIMEOUT', '30000'), 10),
  ANTHROPIC_API_KEY: getEnvVar('ANTHROPIC_API_KEY'),

  // API Endpoints
  ENDPOINTS: {
    // Auth
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH_TOKEN: '/auth/refresh',
    LOGOUT: '/auth/logout',

    // User
    ME: '/users/me',
    UPDATE_PROFILE: '/users/profile',

    // Patients
    PATIENTS: '/patients',
    PATIENT_BY_ID: (id: string) => `/patients/${id}`,
    PATIENT_SEARCH: '/patients/search',

    // Recordings
    RECORDINGS: '/recordings',
    RECORDING_BY_ID: (id: string) => `/recordings/${id}`,
    UPLOAD_RECORDING: '/recordings/upload',

    // Transcriptions
    TRANSCRIBE: '/transcriptions',
    TRANSCRIPTION_BY_ID: (id: string) => `/transcriptions/${id}`,

    // SOAP Notes
    SOAP_NOTES: '/soap-notes',
    SOAP_NOTE_BY_ID: (id: string) => `/soap-notes/${id}`,
    GENERATE_SOAP: '/soap-notes/generate',

    // WhatsApp
    SEND_MESSAGE: '/whatsapp/send',
    MESSAGE_TEMPLATES: '/whatsapp/templates',

    // Prevention Plan Templates
    PREVENTION_TEMPLATES: '/prevention/templates',
    PREVENTION_TEMPLATE_BY_ID: (id: string) => `/prevention/templates/${id}`,
    PREVENTION_TEMPLATE_VERSIONS: (id: string) => `/prevention/templates/${id}/versions`,
    PREVENTION_TEMPLATE_VERSION_BY_ID: (templateId: string, versionId: string) => `/prevention/templates/${templateId}/versions/${versionId}`,
    PREVENTION_TEMPLATE_COMMENTS: (id: string) => `/prevention/templates/${id}/comments`,
    PREVENTION_TEMPLATE_COMMENT_BY_ID: (templateId: string, commentId: string) => `/prevention/templates/${templateId}/comments/${commentId}`,
    PREVENTION_TEMPLATE_SHARES: (id: string) => `/prevention/templates/${id}/share`,
    PREVENTION_TEMPLATE_SHARE_BY_USER: (templateId: string, userId: string) => `/prevention/templates/${templateId}/share/${userId}`,
    PREVENTION_TEMPLATES_SHARED_WITH_ME: '/prevention/templates/shared-with-me',
    PREVENTION_TEMPLATE_COMPARE: (id: string) => `/prevention/templates/${id}/compare`,
    PREVENTION_TEMPLATE_REVERT: (id: string) => `/prevention/templates/${id}/revert`,

    // Prevention Plans (Patient-specific)
    PREVENTION_PLANS: (patientId: string) => `/prevention/plans/${patientId}`,
    PREVENTION_PLAN_REMINDERS: (planId: string) => `/prevention/plans/${planId}/reminders`,
    PREVENTION_PLAN_AUTO_GENERATE_REMINDERS: (planId: string) => `/prevention/plans/${planId}/reminders/auto-generate`,

    // Bulk Operations
    PREVENTION_TEMPLATES_BULK_ACTIVATE: '/prevention/templates/bulk/activate',
    PREVENTION_TEMPLATES_BULK_DEACTIVATE: '/prevention/templates/bulk/deactivate',
    PREVENTION_TEMPLATES_BULK_DELETE: '/prevention/templates/bulk/delete',
    PREVENTION_TEMPLATES_BULK_DUPLICATE: '/prevention/templates/bulk/duplicate',
  },
} as const;
