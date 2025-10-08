// User & Authentication
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

// Patient
export type Patient = {
  id: string;
  mrn: string; // Medical Record Number
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

// Recording
export type RecordingStatus = 'recording' | 'paused' | 'completed' | 'processing' | 'failed';

export type Recording = {
  id: string;
  patientId: string;
  patient?: Patient;
  clinicianId: string;
  status: RecordingStatus;
  startTime: string;
  endTime?: string;
  duration: number; // in seconds
  fileUri: string;
  fileSize?: number;
  transcriptionId?: string;
  soapNoteId?: string;
  createdAt: string;
  updatedAt: string;
};

// Transcription
export type SpeakerType = 'doctor' | 'patient' | 'unknown';

export type TranscriptionSegment = {
  speaker: SpeakerType;
  text: string;
  timestamp: number; // in seconds from recording start
  confidence?: number; // 0-1
};

export type Transcription = {
  id: string;
  recordingId: string;
  segments: TranscriptionSegment[];
  fullText: string;
  language: 'en' | 'es' | 'pt';
  processingTime?: number; // in milliseconds
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  createdAt: string;
};

// SOAP Note
export type SOAPNote = {
  id: string;
  recordingId: string;
  transcriptionId: string;
  patientId: string;
  clinicianId: string;

  // SOAP Sections
  subjective: string; // Patient's narrative
  objective: string; // Clinical findings
  assessment: string; // Diagnosis
  plan: string; // Treatment plan

  // Additional Fields
  chiefComplaint?: string;
  vitalSigns?: VitalSigns;
  diagnoses?: Diagnosis[];
  procedures?: Procedure[];
  medications?: Medication[];
  followUp?: string;

  // Metadata
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
  bloodPressure?: { systolic: number; diastolic: number };
  heartRate?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
  bmi?: number;
};

export type Diagnosis = {
  code: string; // ICD-10 code
  description: string;
  type: 'primary' | 'secondary';
};

export type Procedure = {
  code: string; // CPT code
  description: string;
};

export type Medication = {
  name: string;
  dosage: string;
  frequency: string;
  duration?: string;
  instructions?: string;
};

// API Response Types
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

// Offline Queue
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
