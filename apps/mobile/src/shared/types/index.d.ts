export type User = {
    id: string;
    email: string;
    name: string;
    role: 'doctor' | 'nurse' | 'admin';
    specialty?: string;
    licenseNumber?: string;
};
export type AuthTokens = {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
};
export type Patient = {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: 'male' | 'female' | 'other';
    phone?: string;
    email?: string;
    address?: string;
    medicalHistory?: string[];
    allergies?: string[];
    currentMedications?: string[];
    lastVisitDate?: string;
};
export type RecordingStatus = 'recording' | 'paused' | 'completed' | 'processing' | 'failed';
export type Recording = {
    id: string;
    patientId: string;
    patient?: Patient;
    clinicianId: string;
    status: RecordingStatus;
    startTime: string;
    endTime?: string;
    duration: number;
    fileUri: string;
    fileSize?: number;
    transcriptionId?: string;
    soapNoteId?: string;
    createdAt: string;
    updatedAt: string;
};
export type SpeakerType = 'doctor' | 'patient' | 'unknown';
export type TranscriptionSegment = {
    speaker: SpeakerType;
    text: string;
    timestamp: number;
    confidence?: number;
};
export type Transcription = {
    id: string;
    recordingId: string;
    segments: TranscriptionSegment[];
    fullText: string;
    language: 'en' | 'es' | 'pt';
    processingTime?: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    error?: string;
    createdAt: string;
};
export type SOAPNote = {
    id: string;
    recordingId: string;
    transcriptionId: string;
    patientId: string;
    clinicianId: string;
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    chiefComplaint?: string;
    vitalSigns?: VitalSigns;
    diagnoses?: Diagnosis[];
    procedures?: Procedure[];
    medications?: Medication[];
    followUp?: string;
    status: 'draft' | 'completed' | 'signed';
    editHistory?: {
        timestamp: string;
        userId: string;
        changes: string;
    }[];
    signedAt?: string;
    signedBy?: string;
    createdAt: string;
    updatedAt: string;
};
export type VitalSigns = {
    bloodPressure?: {
        systolic: number;
        diastolic: number;
    };
    heartRate?: number;
    temperature?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
    weight?: number;
    height?: number;
    bmi?: number;
};
export type Diagnosis = {
    code: string;
    description: string;
    type: 'primary' | 'secondary';
};
export type Procedure = {
    code: string;
    description: string;
};
export type Medication = {
    name: string;
    dosage: string;
    frequency: string;
    duration?: string;
    instructions?: string;
};
export type ApiResponse<T> = {
    success: boolean;
    data: T;
    message?: string;
};
export type ApiError = {
    success: false;
    error: string;
    message: string;
    statusCode: number;
};
export type PaginatedResponse<T> = {
    data: T[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
};
export type QueuedOperation = {
    id: string;
    type: 'recording' | 'transcription' | 'soap_note';
    operation: 'create' | 'update' | 'delete';
    data: any;
    retryCount: number;
    maxRetries: number;
    createdAt: string;
    lastAttempt?: string;
    error?: string;
};
//# sourceMappingURL=index.d.ts.map