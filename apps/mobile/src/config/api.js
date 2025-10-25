"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_CONFIG = void 0;
const expo_constants_1 = __importDefault(require("expo-constants"));
// Get environment variables from app.json extra field or process.env
const getEnvVar = (key, defaultValue = '') => {
    // Try to get from Expo Constants first
    const value = expo_constants_1.default.expoConfig?.extra?.[key];
    if (value)
        return value;
    // Fallback to hardcoded defaults for development
    const defaults = {
        API_URL: 'https://holilabs-lwp6y.ondigitalocean.app/api',
        API_TIMEOUT: '30000',
        ANTHROPIC_API_KEY: '',
    };
    return defaults[key] || defaultValue;
};
exports.API_CONFIG = {
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
        PATIENT_BY_ID: (id) => `/patients/${id}`,
        PATIENT_SEARCH: '/patients/search',
        // Recordings
        RECORDINGS: '/recordings',
        RECORDING_BY_ID: (id) => `/recordings/${id}`,
        UPLOAD_RECORDING: '/recordings/upload',
        // Transcriptions
        TRANSCRIBE: '/transcriptions',
        TRANSCRIPTION_BY_ID: (id) => `/transcriptions/${id}`,
        // SOAP Notes
        SOAP_NOTES: '/soap-notes',
        SOAP_NOTE_BY_ID: (id) => `/soap-notes/${id}`,
        GENERATE_SOAP: '/soap-notes/generate',
        // WhatsApp
        SEND_MESSAGE: '/whatsapp/send',
        MESSAGE_TEMPLATES: '/whatsapp/templates',
    },
};
//# sourceMappingURL=api.js.map