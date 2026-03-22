/**
 * @holi/data-ingestion — Core Type Definitions
 *
 * Health 3.0: Source-Agnostic Data Aggregation
 *
 * Design principle: Every external health data source, regardless of format
 * or protocol, maps to a canonical CanonicalHealthRecord before touching
 * any Holi business logic or database.
 *
 * Supported sources (Phase 1):
 *   - FHIR R4 (REST bundles, SMART on FHIR)
 *   - HL7 v2 (ADT, ORU, ORM messages)
 *   - CSV / Excel (lab exports, device exports)
 *   - Generic REST API (webhooks, polling)
 *   - Direct PostgreSQL / SQLite (legacy EHR DB)
 *   - Manual entry (structured form)
 *
 * Future sources (Phase 2):
 *   - DICOM metadata (already in holilabsv2)
 *   - Wearable device streams (Apple Health, Fitbit, Garmin)
 *   - WhatsApp structured messages
 *   - PDF lab reports (via document-parser package)
 */

// ─────────────────────────────────────────────────────────────────────────────
// SOURCE IDENTIFIERS
// ─────────────────────────────────────────────────────────────────────────────

export type DataSourceType =
  | 'FHIR_R4'
  | 'HL7_V2'
  | 'CSV'
  | 'EXCEL'
  | 'REST_API'
  | 'POSTGRES'
  | 'SQLITE'
  | 'MANUAL'
  | 'DICOM_META'
  | 'WEARABLE_APPLE_HEALTH'
  | 'WEARABLE_GENERIC'
  | 'WHATSAPP_STRUCTURED'
  | 'PDF_REPORT';

export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  /** Connection config — encrypted at rest by CYRUS rules */
  config: SourceConfig;
  /** Which tenant / clinic owns this source */
  tenantId: string;
  /** Which patient this source belongs to (null for org-level sources) */
  patientId?: string;
  createdAt: Date;
  lastSyncedAt?: Date;
  syncIntervalSeconds?: number;
  isActive: boolean;
}

export type SourceConfig =
  | FhirSourceConfig
  | Hl7SourceConfig
  | CsvSourceConfig
  | RestApiSourceConfig
  | DatabaseSourceConfig
  | ManualSourceConfig;

export interface FhirSourceConfig {
  kind: 'FHIR_R4';
  baseUrl: string;
  authType: 'NONE' | 'BASIC' | 'BEARER' | 'SMART_ON_FHIR';
  /** Bearer token or base64 basic creds — stored encrypted */
  credentials?: string;
  patientId?: string;
  resourceTypes: FhirResourceType[];
}

export type FhirResourceType =
  | 'Patient'
  | 'Observation'
  | 'DiagnosticReport'
  | 'MedicationRequest'
  | 'Condition'
  | 'AllergyIntolerance'
  | 'Encounter'
  | 'Immunization'
  | 'Procedure'
  | 'CarePlan'
  | 'Bundle';

export interface Hl7SourceConfig {
  kind: 'HL7_V2';
  /** TCP MLLP endpoint or file drop path */
  endpoint: string;
  port?: number;
  messageTypes: string[]; // e.g. ['ADT^A01', 'ORU^R01']
}

export interface CsvSourceConfig {
  kind: 'CSV' | 'EXCEL';
  /** Column mapping: { sourceColumnName: canonicalFieldName } */
  columnMapping: Record<string, string>;
  hasHeader: boolean;
  delimiter?: string;
  dateFormat?: string;
  encoding?: string;
}

export interface RestApiSourceConfig {
  kind: 'REST_API';
  baseUrl: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  /** JSONPath expressions to extract fields from response */
  fieldMapping: Record<string, string>;
  paginationStyle?: 'OFFSET' | 'CURSOR' | 'NONE';
  pollIntervalSeconds?: number;
}

export interface DatabaseSourceConfig {
  kind: 'POSTGRES' | 'SQLITE';
  /** Connection string — stored encrypted */
  connectionString: string;
  /** SQL query to extract records */
  extractQuery: string;
  /** Column → canonical field mapping */
  columnMapping: Record<string, string>;
}

export interface ManualSourceConfig {
  kind: 'MANUAL';
  /** Schema of the manual entry form */
  formSchema?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL HEALTH RECORD (The Lingua Franca)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Every source, regardless of format, normalizes to this shape.
 * This is the single type that crosses the ingestion boundary into Holi.
 */
export interface CanonicalHealthRecord {
  /** Stable ID assigned by ingestion pipeline */
  ingestId: string;
  /** Which source produced this record */
  sourceId: string;
  sourceType: DataSourceType;
  /** Tenant + patient context */
  tenantId: string;
  patientId?: string;
  /** Timestamps */
  ingestedAt: Date;
  recordedAt?: Date;
  /** The type of clinical data this record represents */
  recordType: CanonicalRecordType;
  /** The actual data payload — typed by recordType */
  payload: CanonicalPayload;
  /** Original raw bytes / object before normalization */
  rawData?: unknown;
  /** Validation result from the schema validator */
  validation: ValidationResult;
  /** Provenance chain for audit */
  provenance: ProvenanceChain;
}

export type CanonicalRecordType =
  | 'LAB_RESULT'
  | 'VITAL_SIGN'
  | 'DIAGNOSIS'
  | 'MEDICATION'
  | 'ALLERGY'
  | 'IMMUNIZATION'
  | 'IMAGING_META'
  | 'CLINICAL_NOTE'
  | 'PROCEDURE'
  | 'ENCOUNTER'
  | 'PATIENT_DEMOGRAPHICS'
  | 'SUPPLY_CHAIN_ITEM'
  | 'DEVICE_READING';

export type CanonicalPayload =
  | CanonicalLabResult
  | CanonicalVitalSign
  | CanonicalDiagnosis
  | CanonicalMedication
  | CanonicalAllergy
  | CanonicalImmunization
  | CanonicalImagingMeta
  | CanonicalClinicalNote
  | CanonicalProcedure
  | CanonicalEncounter
  | CanonicalPatientDemographics
  | CanonicalSupplyChainItem
  | CanonicalDeviceReading;

// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL PAYLOAD SHAPES
// ─────────────────────────────────────────────────────────────────────────────

export interface CanonicalLabResult {
  kind: 'LAB_RESULT';
  testName: string;
  loincCode?: string;
  value: number | string;
  unit: string;
  referenceRangeLow?: number;
  referenceRangeHigh?: number;
  interpretation?: 'NORMAL' | 'ABNORMAL' | 'CRITICAL_HIGH' | 'CRITICAL_LOW' | 'INDETERMINATE';
  specimenCollectedAt?: Date;
  resultedAt?: Date;
  orderingProviderNpi?: string;
  performingLabName?: string;
  note?: string;
}

export interface CanonicalVitalSign {
  kind: 'VITAL_SIGN';
  vitalType: 'BLOOD_PRESSURE' | 'HEART_RATE' | 'RESPIRATORY_RATE' | 'TEMPERATURE' | 'SPO2' | 'WEIGHT' | 'HEIGHT' | 'BMI' | 'BLOOD_GLUCOSE' | 'OTHER';
  value: number;
  secondaryValue?: number; // e.g., diastolic for BP
  unit: string;
  loincCode?: string;
  measuredAt: Date;
  deviceId?: string;
  method?: string;
}

export interface CanonicalDiagnosis {
  kind: 'DIAGNOSIS';
  icd10Code: string;
  icd10Display: string;
  clinicalStatus: 'ACTIVE' | 'RESOLVED' | 'INACTIVE' | 'RECURRENCE';
  onsetDate?: Date;
  severity?: 'MILD' | 'MODERATE' | 'SEVERE';
  note?: string;
}

export interface CanonicalMedication {
  kind: 'MEDICATION';
  name: string;
  rxNormCode?: string;
  dose?: string;
  doseUnit?: string;
  frequency?: string;
  route?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'STOPPED' | 'PROPOSED';
  startDate?: Date;
  endDate?: Date;
  prescribingProviderNpi?: string;
}

export interface CanonicalAllergy {
  kind: 'ALLERGY';
  allergen: string;
  snomedCode?: string;
  type: 'DRUG' | 'FOOD' | 'ENVIRONMENTAL' | 'OTHER';
  reaction?: string;
  severity?: 'MILD' | 'MODERATE' | 'SEVERE' | 'LIFE_THREATENING';
  onsetDate?: Date;
  status: 'ACTIVE' | 'INACTIVE' | 'UNVERIFIED';
}

export interface CanonicalImmunization {
  kind: 'IMMUNIZATION';
  vaccineName: string;
  cvxCode?: string;
  lotNumber?: string;
  administeredAt: Date;
  expirationDate?: Date;
  route?: string;
  site?: string;
  administeredByNpi?: string;
}

export interface CanonicalImagingMeta {
  kind: 'IMAGING_META';
  modality: 'CT' | 'MRI' | 'XRAY' | 'ULTRASOUND' | 'PET' | 'OTHER';
  bodyPart?: string;
  studyDate: Date;
  accessionNumber?: string;
  dicomStudyUid?: string;
  reportText?: string;
  impression?: string;
}

export interface CanonicalClinicalNote {
  kind: 'CLINICAL_NOTE';
  noteType: 'SOAP' | 'PROGRESS' | 'DISCHARGE' | 'REFERRAL' | 'CONSULTATION' | 'OTHER';
  text: string;
  authorNpi?: string;
  encounterDate: Date;
  specialty?: string;
}

export interface CanonicalProcedure {
  kind: 'PROCEDURE';
  procedureName: string;
  cptCode?: string;
  snomedCode?: string;
  performedAt: Date;
  performingProviderNpi?: string;
  status: 'COMPLETED' | 'PLANNED' | 'CANCELLED';
  note?: string;
}

export interface CanonicalEncounter {
  kind: 'ENCOUNTER';
  encounterType: 'INPATIENT' | 'OUTPATIENT' | 'EMERGENCY' | 'TELEHEALTH' | 'HOME_VISIT';
  startDate: Date;
  endDate?: Date;
  facilityName?: string;
  facilityId?: string;
  reasonCode?: string;
  reasonDisplay?: string;
  dischargeDisposition?: string;
}

export interface CanonicalPatientDemographics {
  kind: 'PATIENT_DEMOGRAPHICS';
  firstName?: string;
  lastName?: string;
  birthDate?: Date;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN';
  nationalId?: string; // CPF (Brazil), CURP (Mexico), etc. — CYRUS: must encrypt
  phone?: string;
  email?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
}

/** Supply chain item — connects to the supply chain simulation plan */
export interface CanonicalSupplyChainItem {
  kind: 'SUPPLY_CHAIN_ITEM';
  itemId: string;
  itemName: string;
  category: string;
  quantity: number;
  unit: string;
  facilityId: string;
  transactionType: 'RECEIVED' | 'CONSUMED' | 'TRANSFERRED' | 'STOCKOUT' | 'RETURNED';
  transactionAt: Date;
  batchNumber?: string;
  expiresAt?: Date;
  costUsd?: number;
}

/** Wearable/IoT device reading */
export interface CanonicalDeviceReading {
  kind: 'DEVICE_READING';
  deviceType: string;
  deviceId: string;
  metric: string;
  value: number;
  unit: string;
  readingAt: Date;
  rawJson?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION & PROVENANCE
// ─────────────────────────────────────────────────────────────────────────────

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  completenessScore: number; // 0-1: proportion of optional fields populated
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
}

export interface ProvenanceChain {
  /** Original source system name */
  sourceSystem: string;
  /** Original record ID in source system */
  sourceRecordId?: string;
  /** Hash of rawData for tamper detection */
  rawDataHash: string;
  /** Which normalizer transformed this record */
  normalizerVersion: string;
  /** Normalizer run timestamp */
  normalizedAt: Date;
  /** Any intermediate transformations applied */
  transformations: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE EVENTS
// ─────────────────────────────────────────────────────────────────────────────

export interface IngestionJob {
  jobId: string;
  sourceId: string;
  tenantId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
  totalRecords: number;
  successCount: number;
  failureCount: number;
  errors: IngestionError[];
}

export interface IngestionError {
  recordIndex?: number;
  sourceRecordId?: string;
  errorCode: string;
  message: string;
  rawData?: unknown;
}

export interface ConnectorResult {
  records: CanonicalHealthRecord[];
  job: IngestionJob;
}
