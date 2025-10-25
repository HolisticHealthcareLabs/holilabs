export declare const API_CONFIG: {
    readonly BASE_URL: string;
    readonly TIMEOUT: number;
    readonly ANTHROPIC_API_KEY: string;
    readonly ENDPOINTS: {
        readonly LOGIN: "/auth/login";
        readonly REGISTER: "/auth/register";
        readonly REFRESH_TOKEN: "/auth/refresh";
        readonly LOGOUT: "/auth/logout";
        readonly ME: "/users/me";
        readonly UPDATE_PROFILE: "/users/profile";
        readonly PATIENTS: "/patients";
        readonly PATIENT_BY_ID: (id: string) => string;
        readonly PATIENT_SEARCH: "/patients/search";
        readonly RECORDINGS: "/recordings";
        readonly RECORDING_BY_ID: (id: string) => string;
        readonly UPLOAD_RECORDING: "/recordings/upload";
        readonly TRANSCRIBE: "/transcriptions";
        readonly TRANSCRIPTION_BY_ID: (id: string) => string;
        readonly SOAP_NOTES: "/soap-notes";
        readonly SOAP_NOTE_BY_ID: (id: string) => string;
        readonly GENERATE_SOAP: "/soap-notes/generate";
        readonly SEND_MESSAGE: "/whatsapp/send";
        readonly MESSAGE_TEMPLATES: "/whatsapp/templates";
    };
};
//# sourceMappingURL=api.d.ts.map