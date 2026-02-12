/**
 * @holi/shared-kernel — Core Type Definitions
 *
 * THE CONTRACT BETWEEN TRACK A (CLINIC) AND TRACK B (ENTERPRISE).
 *
 * Rules:
 * 1. Every type here is consumed by BOTH apps/clinic and apps/enterprise.
 * 2. Breaking changes require SWARM-K approval + version bump.
 * 3. App-specific types belong in their own apps/*/src/types/, NOT here.
 * 4. All dates are ISO-8601 strings. All IDs are branded string types.
 *
 * @module @holi/shared-kernel
 */

// ============================================================================
// BRANDED ID TYPES (prevent mixing IDs across domains)
// ============================================================================

/** Nominal/branded type helper — prevents accidental ID mixing at compile time. */
type Brand<T, B extends string> = T & { readonly __brand: B };

/** Internal database ID for a patient. Used by both Clinic and Enterprise. */
export type PatientId = Brand<string, 'PatientId'>;

/** Anonymized patient identifier for insurer/enterprise contexts. */
export type AnonymizedPatientId = Brand<string, 'AnonymizedPatientId'>;

/** Internal user ID (doctor, admin, nurse). */
export type UserId = Brand<string, 'UserId'>;

/** Organization/Clinic/Hospital ID. */
export type OrganizationId = Brand<string, 'OrganizationId'>;

/** Clinical rule ID from the content registry. */
export type RuleId = Brand<string, 'RuleId'>;

/** Governance event ID. */
export type GovernanceEventId = Brand<string, 'GovernanceEventId'>;

/** Insurance claim ID (TISS/TUSS). */
export type ClaimId = Brand<string, 'ClaimId'>;

// ============================================================================
// UNIVERSAL PATIENT PROFILE
// "Same Patient, Different View" — solved via discriminated union.
//
// Clinic sees: name, WhatsApp, appointments, clinical notes.
// Enterprise sees: anonymized ID, claim history, risk scores.
// Both share: demographics (age, sex), conditions, medications.
// ============================================================================

/** Demographic data shared between Clinic and Enterprise views. */
export interface PatientDemographics {
  /** Date of birth (ISO-8601). */
  dateOfBirth: string;
  /** Biological sex at birth (for clinical rule evaluation). */
  biologicalSex: 'male' | 'female' | 'other' | 'unknown';
  /** Age in years (computed, not stored). */
  ageYears: number;
  /** ISO-3166-1 alpha-2 country code. */
  country: string;
  /** Brazilian state (UF) if applicable. */
  state?: string;
}

/** Active conditions relevant to protocol evaluation. */
export interface PatientCondition {
  /** ICD-10 code. */
  icd10Code: string;
  /** Human-readable name. */
  displayName: string;
  /** When the condition was first recorded (ISO-8601). */
  onsetDate: string;
  /** Active / resolved / remission. */
  clinicalStatus: 'active' | 'resolved' | 'remission';
}

/** Current medications for drug interaction checks. */
export interface PatientMedication {
  /** RxNorm CUI or local code. */
  rxnormCode?: string;
  /** Drug name (generic). */
  genericName: string;
  /** Daily dose with unit (e.g., "5 mg"). */
  dose: string;
  /** Route of administration. */
  route: string;
  /** Start date (ISO-8601). */
  startDate: string;
}

/** Lab result relevant to clinical decision (e.g., CrCl for DOAC dosing). */
export interface PatientLabResult {
  /** LOINC code. */
  loincCode: string;
  /** Test name. */
  testName: string;
  /** Numeric value. */
  value: number;
  /** Unit (e.g., "mL/min", "mg/dL"). */
  unit: string;
  /** Collection date (ISO-8601). */
  collectedAt: string;
  /** Is this result considered "stale" (>72h for renal, >24h for coag)? */
  isStale: boolean;
}

/**
 * CLINIC VIEW — Full patient identity for the treating clinician.
 * Contains PII. Never sent to Enterprise without anonymization.
 */
export interface ClinicPatientProfile {
  readonly __view: 'clinic';
  id: PatientId;
  /** Full legal name. */
  fullName: string;
  /** CPF (Brazilian tax ID) — encrypted at rest. */
  cpf?: string;
  /** WhatsApp number (E.164 format). */
  whatsappNumber?: string;
  /** Email address. */
  email?: string;
  /** Primary insurance plan (if any). */
  insurancePlan?: string;
  /** Demographics. */
  demographics: PatientDemographics;
  /** Active conditions. */
  conditions: PatientCondition[];
  /** Current medications. */
  medications: PatientMedication[];
  /** Recent lab results. */
  labResults: PatientLabResult[];
  /** Consent status for data processing. */
  lgpdConsent: ConsentStatus;
  /** Consent status for WhatsApp reminders. */
  reminderConsent: ConsentStatus;
}

/**
 * ENTERPRISE VIEW — Anonymized patient profile for insurer/actuary.
 * NO PII. Safe for cross-hospital benchmarking.
 */
export interface EnterprisePatientProfile {
  readonly __view: 'enterprise';
  anonymizedId: AnonymizedPatientId;
  /** Source organization (for benchmarking). */
  sourceOrgId: OrganizationId;
  /** Demographics (age, sex, country — no name). */
  demographics: PatientDemographics;
  /** Active conditions (ICD-10 codes only). */
  conditions: PatientCondition[];
  /** Current medications (generic names only). */
  medications: PatientMedication[];
  /** Recent lab results. */
  labResults: PatientLabResult[];
  /** Claims history summary. */
  claimsSummary: ClaimsSummary;
  /** Computed risk scores. */
  riskScores: RiskScoreSet;
}

/** Discriminated union — use type narrowing on `__view`. */
export type UniversalPatientProfile = ClinicPatientProfile | EnterprisePatientProfile;

/** Type guard for Clinic view. */
export function isClinicView(p: UniversalPatientProfile): p is ClinicPatientProfile {
  return p.__view === 'clinic';
}

/** Type guard for Enterprise view. */
export function isEnterpriseView(p: UniversalPatientProfile): p is EnterprisePatientProfile {
  return p.__view === 'enterprise';
}

// ============================================================================
// CONSENT
// ============================================================================

export interface ConsentStatus {
  /** Has the patient given consent? */
  granted: boolean;
  /** Consent version accepted (e.g., "2.1"). */
  version: string;
  /** When consent was last updated (ISO-8601). */
  updatedAt: string;
  /** Consent expiration date (ISO-8601), if applicable. */
  expiresAt?: string;
}

// ============================================================================
// PROTOCOL OUTPUT — "Same Engine, Different Presentation"
//
// The Clinical Protocol Engine evaluates rules and returns a ProtocolResult.
// Clinic renders it as a readable report. Enterprise consumes it as JSON risk data.
// ============================================================================

export type ProtocolSeverity = 'BLOCK' | 'FLAG' | 'INFO';
export type ProtocolStatus = 'PASS' | 'FAIL' | 'ATTESTATION_REQUIRED' | 'INSUFFICIENT_DATA';

/** A single rule evaluation result. */
export interface RuleEvaluation {
  ruleId: RuleId;
  ruleName: string;
  domain: string;
  severity: ProtocolSeverity;
  status: ProtocolStatus;
  /** Human-readable message (for Clinic PDF). */
  message: string;
  /** Structured recommendation. */
  recommendation: string;
  /** Rule provenance for audit trail. */
  provenance: {
    sourceAuthority: string;
    sourceDocument: string;
    sourceVersion: string;
    effectiveDate: string;
    jurisdiction: string;
  };
  /** Raw data that triggered this evaluation (for Enterprise risk model input). */
  triggerData?: Record<string, unknown>;
}

/** Complete output from the Protocol Engine. */
export interface ProtocolResult {
  /** Unique evaluation ID (for audit). */
  evaluationId: string;
  /** Patient ID (branded). */
  patientId: PatientId | AnonymizedPatientId;
  /** Timestamp of evaluation (ISO-8601). */
  evaluatedAt: string;
  /** Bundle version used for evaluation. */
  bundleVersion: string;
  /** Bundle checksum used for evaluation. */
  bundleChecksum: string;
  /** Overall status (worst-case of all rules). */
  overallStatus: ProtocolStatus;
  /** Individual rule results. */
  rules: RuleEvaluation[];
  /** Count by severity. */
  summary: {
    blocks: number;
    flags: number;
    infos: number;
    passed: number;
    insufficientData: number;
  };
}

/**
 * CLINIC OUTPUT ADAPTER
 * Transforms ProtocolResult into a PDF-friendly structure.
 */
export interface ClinicProtocolReport {
  readonly __format: 'clinic_report';
  patientName: string;
  evaluationDate: string;
  /** Sections grouped by severity for doctor reading. */
  sections: {
    critical: Array<{ title: string; message: string; recommendation: string }>;
    warnings: Array<{ title: string; message: string; recommendation: string }>;
    passed: Array<{ title: string; message: string }>;
  };
  /** Doctor attestation section. */
  attestation: {
    required: boolean;
    overrideReasons?: string[];
  };
}

/**
 * ENTERPRISE OUTPUT ADAPTER
 * Transforms ProtocolResult into actuary-consumable JSON.
 */
export interface EnterpriseRiskAssessment {
  readonly __format: 'enterprise_risk';
  anonymizedPatientId: AnonymizedPatientId;
  evaluatedAt: string;
  /** Composite risk score (0-100). */
  compositeRiskScore: number;
  /** Risk category. */
  riskTier: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  /** Per-domain risk breakdown. */
  domainRisks: Array<{
    domain: string;
    score: number;
    blockCount: number;
    flagCount: number;
  }>;
  /** Predicted cost impact (BRL). */
  predictedCostImpact: {
    hospitalizationProbability30d: number;
    estimatedCostBRL: number;
    confidenceInterval: [number, number];
  };
  /** Protocol compliance rate. */
  protocolCompliance: number;
  /** Source protocol engine metadata. */
  engineMetadata: {
    bundleVersion: string;
    bundleChecksum: string;
    rulesEvaluated: number;
  };
}

// ============================================================================
// CLAIMS & RISK (Enterprise-specific data, but type lives in Kernel
// because it flows through the shared Protocol Engine)
// ============================================================================

/** Summary of insurance claims for a patient. */
export interface ClaimsSummary {
  /** Total claims in the last 12 months. */
  totalClaims12m: number;
  /** Total cost in BRL. */
  totalCostBRL12m: number;
  /** Number of hospitalizations. */
  hospitalizations12m: number;
  /** Average days per hospitalization. */
  avgLengthOfStayDays: number;
  /** Top 3 ICD-10 codes by cost. */
  topConditionsByCost: Array<{
    icd10Code: string;
    displayName: string;
    costBRL: number;
  }>;
  /** TISS/TUSS procedure codes summary. */
  topProcedures: Array<{
    tussCode: string;
    description: string;
    count: number;
    totalCostBRL: number;
  }>;
}

/** Risk scores computed by the Enterprise ML pipeline. */
export interface RiskScoreSet {
  /** Hospitalization risk in next 30 days (0-1 probability). */
  hospitalization30d: number;
  /** Hospitalization risk in next 90 days. */
  hospitalization90d: number;
  /** Emergency visit risk in next 30 days. */
  emergencyVisit30d: number;
  /** Medication non-adherence risk. */
  nonAdherenceRisk: number;
  /** Composite "sinistralidade" score (0-100). */
  sinistralidade: number;
  /** Model version that produced these scores. */
  modelVersion: string;
  /** Timestamp of computation (ISO-8601). */
  computedAt: string;
  /** Confidence score (0-1). */
  confidence: number;
}

// ============================================================================
// GOVERNANCE EVENTS (Shared — both tracks produce audit events)
// ============================================================================

export type GovernanceAction =
  | 'RULE_TRIGGERED'
  | 'OVERRIDE_REQUESTED'
  | 'OVERRIDE_APPROVED'
  | 'OVERRIDE_DENIED'
  | 'ATTESTATION_SIGNED'
  | 'PROTOCOL_EVALUATED'
  | 'RISK_SCORE_COMPUTED'
  | 'CONSENT_GRANTED'
  | 'CONSENT_REVOKED'
  | 'DATA_ACCESSED'
  | 'DATA_EXPORTED';

export interface GovernanceEvent {
  id: GovernanceEventId;
  action: GovernanceAction;
  /** Who triggered the event. */
  actorId: UserId;
  /** When it happened (ISO-8601). */
  timestamp: string;
  /** Patient involved (if any). */
  patientId?: PatientId | AnonymizedPatientId;
  /** Organization context. */
  organizationId?: OrganizationId;
  /** Country context (ISO-3166-1 alpha-2). */
  country: string;
  /** Site identifier. */
  site: string;
  /** Structured payload. */
  payload: Record<string, unknown>;
  /** Protocol/rule that triggered this event. */
  protocolReference?: {
    ruleId: RuleId;
    bundleVersion: string;
    severity: ProtocolSeverity;
  };
}

// ============================================================================
// AUDIT EVENT (LGPD-compliant access logging)
// ============================================================================

export interface AuditEvent {
  /** Unique audit ID. */
  id: string;
  /** ISO-8601 timestamp. */
  timestamp: string;
  /** Who accessed the data. */
  actorId: UserId;
  /** What resource was accessed (e.g., "patient:123:lab-results"). */
  resource: string;
  /** Action performed. */
  action: 'READ' | 'WRITE' | 'DELETE' | 'EXPORT' | 'ANONYMIZE';
  /** Structured reason for access (LGPD Art. 7). */
  accessReason: {
    legalBasis: 'CONSENT' | 'LEGITIMATE_INTEREST' | 'LEGAL_OBLIGATION' | 'VITAL_INTEREST';
    description: string;
  };
  /** IP address of the requester. */
  ipAddress: string;
  /** User agent string. */
  userAgent: string;
  /** Outcome. */
  outcome: 'SUCCESS' | 'DENIED' | 'ERROR';
}

// ============================================================================
// DATABASE SCHEMA GOVERNANCE (Extension Table Pattern)
//
// Core tables (users, patients, organizations) are owned by SWARM-K.
// Extension tables follow this naming convention:
//   - clinic_*     → owned by SWARM-C (e.g., clinic_appointments)
//   - enterprise_* → owned by SWARM-E (e.g., enterprise_risk_scores)
//   - gov_*        → owned by SWARM-K (e.g., gov_audit_events)
//
// FK references always point TO core tables, never BETWEEN extensions.
// ============================================================================

export interface SchemaGovernanceRules {
  /** Core tables — only SWARM-K can modify. */
  coreTables: readonly string[];
  /** Clinic extension prefix. */
  clinicPrefix: 'clinic_';
  /** Enterprise extension prefix. */
  enterprisePrefix: 'enterprise_';
  /** Governance prefix. */
  governancePrefix: 'gov_';
  /** Migration authority. */
  migrationAuthority: 'SWARM-K';
}

export const SCHEMA_GOVERNANCE: SchemaGovernanceRules = {
  coreTables: [
    'users',
    'patients',
    'organizations',
    'encounters',
    'conditions',
    'medications',
    'lab_results',
    'consents',
    'documents',
  ] as const,
  clinicPrefix: 'clinic_',
  enterprisePrefix: 'enterprise_',
  governancePrefix: 'gov_',
  migrationAuthority: 'SWARM-K',
};

// ============================================================================
// PUBLIC API — Re-exports for barrel import
// ============================================================================

export {
  // From clinical/content-types
  type ClinicalProvenance,
  type ClinicalRuleDomain,
  type ClinicalRuleSeverity,
  type ClinicalSourceRecord,
  type ClinicalRuleRecord,
  type ClinicalBundleManifest,
  type ClinicalContentBundle,
} from './src/clinical/content-types';

export {
  // From clinical/content-registry
  type ContentRegistry,
} from './src/clinical/content-registry';

export {
  // From governance/shared-types
  type OverrideReason,
  type GovernanceContext,
} from './src/governance/shared-types';
