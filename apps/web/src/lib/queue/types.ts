/**
 * CDSS V3 - Queue Job Type Definitions
 *
 * Type-safe job data interfaces for BullMQ async processing queues.
 * These types ensure compile-time safety for job payloads.
 */

// ============================================================================
// DOCUMENT PARSE QUEUE
// ============================================================================

export interface DocumentParseJobData {
  /** Patient ID for ownership tracking */
  patientId: string;
  /** Path to file in shared volume */
  filePath: string;
  /** Original filename for display */
  originalName: string;
  /** MIME type of the document */
  mimeType: string;
  /** Optional encounter ID if uploaded during visit */
  encounterId?: string;
  /** User ID who uploaded the document */
  uploadedBy: string;
  /** File size in bytes */
  fileSizeBytes: number;
}

export interface DocumentParseJobResult {
  /** Created document record ID */
  documentId: string;
  /** Whether parsing succeeded */
  success: boolean;
  /** Number of pages extracted (for PDFs) */
  pageCount?: number;
  /** Number of tables extracted */
  tableCount?: number;
  /** Any warnings during parsing */
  warnings?: string[];
}

// ============================================================================
// SUMMARY GENERATION QUEUE
// ============================================================================

export interface PatientContext {
  /** Patient age in years */
  age: number;
  /** Patient biological sex */
  sex: 'male' | 'female' | 'other';
  /** List of active conditions/diagnoses */
  conditions: string[];
  /** List of current medications */
  medications: string[];
  /** Relevant allergies */
  allergies?: string[];
  /** Recent vital signs */
  recentVitals?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    weight?: number;
  };
}

export interface SummaryGenJobData {
  /** Encounter ID for the visit */
  encounterId: string;
  /** De-identified transcript (PHI already removed) */
  deidTranscript: string;
  /** Patient context for the summary */
  patientContext: PatientContext;
  /** Provider ID who requested the summary */
  providerId: string;
  /** Language for the summary output */
  language?: 'en' | 'es' | 'pt';
}

export interface SummaryGenJobResult {
  /** Encounter ID the summary was generated for */
  encounterId: string;
  /** Whether generation succeeded */
  success: boolean;
  /** The generated summary draft (validated by SummaryDraftSchema) */
  draft?: import('@/lib/schemas/summary-draft.schema').SummaryDraft;
  /** Model used for generation */
  modelUsed?: string;
  /** Token count for billing */
  tokenCount?: number;
  /** Error message if failed */
  error?: string;
}

// ============================================================================
// FHIR SYNC QUEUE
// ============================================================================

export type FhirResourceType =
  | 'Patient'
  | 'Observation'
  | 'MedicationRequest'
  | 'Condition'
  | 'Procedure'
  | 'DiagnosticReport'
  | 'CarePlan'
  | 'Appointment';

export type SyncDirection = 'INBOUND' | 'OUTBOUND';

export type SyncOperation = 'CREATE' | 'UPDATE' | 'DELETE';

export interface FhirSyncJobData {
  /** Direction of sync: INBOUND (Medplum → Local) or OUTBOUND (Local → Medplum) */
  direction: SyncDirection;
  /** FHIR resource type being synced */
  resourceType: FhirResourceType;
  /** Local record ID */
  localId: string;
  /** FHIR resource ID (if known) */
  fhirResourceId?: string;
  /** Operation to perform */
  operation: SyncOperation;
  /** Local version for optimistic locking */
  localVersion: number;
  /** Remote FHIR meta.versionId (if known) */
  remoteVersion?: string;
  /** The payload to sync */
  payload: unknown;
}

export interface FhirSyncJobResult {
  /** Whether sync succeeded */
  success: boolean;
  /** Created/Updated FHIR resource ID */
  fhirResourceId?: string;
  /** New version after sync */
  newVersion?: string;
  /** Whether a conflict was detected */
  hasConflict?: boolean;
  /** Conflict data if conflict detected */
  conflictData?: {
    local: unknown;
    remote: unknown;
  };
  /** Error message if failed */
  error?: string;
}

// ============================================================================
// JOB STATUS (for API responses)
// ============================================================================

export type JobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';

export interface JobStatusResponse {
  /** Job ID */
  id: string;
  /** Current job status */
  status: JobStatus;
  /** Progress percentage (0-100) */
  progress: number;
  /** Job result if completed */
  result?: unknown;
  /** Error message if failed */
  error?: string;
  /** When the job was created */
  createdAt?: string;
  /** When the job started processing */
  startedAt?: string;
  /** When the job completed */
  completedAt?: string;
}
