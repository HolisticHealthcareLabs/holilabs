/**
 * @holi/shared-kernel — Core Type Definitions
 *
 * THE CONTRACT BETWEEN TRACK A (CLINIC) AND TRACK B (ENTERPRISE).
 *
 * Rules:
 * 1. Every type here is consumed by BOTH apps/clinic and apps/enterprise.
 * 2. Breaking changes require SWARM-K approval + version bump.
 * 3. App-specific types belong in their own apps/[app]/src/types/, NOT here.
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

export {
  // From clinical-ui types (Sprint 01 — Safety Signal contract)
  type SafetyAlertProps,
  type SafetyAlertVariant,
} from './src/types/clinical-ui';

// ============================================================================
// BLUE OCEAN — Actuarial Types (Phase 3)
// ============================================================================

/** Composite risk score produced by the RiskCalculatorService. */
export interface CompositeRiskScore {
  /** Overall risk score 0-100 (higher = riskier). */
  compositeScore: number;
  /** Tier classification. */
  riskTier: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  /** Individual domain scores for transparency. */
  domainBreakdown: {
    cardiovascular: number;
    metabolic: number;
    screeningCompliance: number;
    lifestyle: number;
    overrideRisk: number;
  };
  /** Confidence level 0-1 (penalized by missing data). */
  confidence: number;
  /** Fields that were null/missing. */
  missingFields: string[];
  /** Computed at (ISO-8601). */
  computedAt: string;
}

/** De-identified actuarial payload for insurer consumption. */
export interface ActuarialPayload {
  readonly __format: 'enterprise_risk_export';
  /** Pseudonymized patient token. */
  anonymizedPatientId: AnonymizedPatientId;
  /** Composite risk score (0-100). */
  compositeRiskScore: number;
  /** Risk tier classification. */
  riskTier: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  /** Domain breakdown (no PII). */
  domainBreakdown: CompositeRiskScore['domainBreakdown'];
  /** Confidence level (0-1). */
  confidence: number;
  /** TUSS procedure codes context. */
  tussCodes: string[];
  /** Protocol compliance rate. */
  protocolCompliance: number;
  /** Source organization (hashed for benchmarking). */
  sourceOrgHash: string;
  /** Timestamp of export (ISO-8601). */
  exportedAt: string;
  /** Data freshness — when the risk was computed (ISO-8601). */
  riskComputedAt: string;
}

// ============================================================================
// BLUE OCEAN — Phase 5: Flywheel Types
// ============================================================================

/** Persisted enterprise assessment log entry — the flywheel data asset. */
export interface FlywheelAssessmentEntry {
  id: string;
  anonymizedPatientId: string;
  assessmentPayload: ActuarialPayload;
  trafficLightColor: 'RED' | 'YELLOW' | 'GREEN';
  signalCount: number;
  compositeRiskScore: number;
  riskTier: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  organizationId: string;
  createdAt: string;
}

/** Enterprise API usage log entry for billing/metering. */
export interface EnterpriseUsageLogEntry {
  id: string;
  endpoint: string;
  apiKeyHash: string;
  timestamp: string;
  responseTimeMs: number;
  patientCount: number;
  statusCode: number;
  method: string;
}

/** Webhook event types dispatched by the flywheel. */
export type WebhookEventType = 'RISK_THRESHOLD_CROSSED' | 'ASSESSMENT_COMPLETED' | 'BULK_ASSESSMENT_COMPLETED';

/** Webhook subscription configuration. */
export interface WebhookSubscriptionConfig {
  id: string;
  apiKeyHash: string;
  url: string;
  events: WebhookEventType[];
  secret: string;
  isActive: boolean;
  createdAt: string;
}

/** Patient outcome types for actuarial correlation. */
export type PatientOutcomeType = 'READMISSION' | 'ADVERSE_EVENT' | 'COMPLICATION' | 'RESOLVED';

/** Recorded patient outcome linked to override decisions. */
export interface PatientOutcomeRecord {
  id: string;
  anonymizedPatientId: string;
  outcomeType: PatientOutcomeType;
  linkedOverrideIds: string[];
  metadata: Record<string, unknown>;
  recordedAt: string;
  recordedBy: string;
}

/** Aggregate stats correlating overrides with patient outcomes. */
export interface OverrideOutcomeCorrelationStats {
  totalOverrides: number;
  totalOutcomes: number;
  overridesWithAdverseOutcome: number;
  adverseEventRate: number;
  readmissionRate: number;
  complicationRate: number;
  resolvedRate: number;
  byOutcomeType: Record<string, number>;
  correlationConfidence: number;
}

/** Extended TUSS category including Phase 5 additions. */
export type TUSSCategory = 'STANDARD' | 'DIAGNOSTIC' | 'SPECIALIZED' | 'SURGICAL' | 'PREVENTIVE' | 'REHABILITATION' | 'MENTAL_HEALTH';

// ============================================================================
// TRI-COUNTRY BILLING INTELLIGENCE (Phase 6)
// Consumed by: BillingRouter, TISS serializer, enterprise API, UI widget
// ============================================================================

/** ISO-3166-1 alpha-2 country codes for supported billing markets. */
export type BillingCountry = 'BR' | 'AR' | 'BO' | 'US' | 'CA' | 'CO' | 'MX';

/**
 * All supported national billing system identifiers.
 * Mirrors the BillingSystem enum in the Prisma schema.
 */
export type BillingSystemCode =
  | 'TUSS'      // Brazil — Terminologia Unificada da Saúde Suplementar
  | 'CBHPM'     // Brazil — Classificação Brasileira Hierarquizada
  | 'CID10_BR'  // Brazil — CID-10 diagnosis cross-reference
  | 'NOMENCLADOR' // Argentina — Nomenclador Nacional de Prestaciones
  | 'CIE10_AR'  // Argentina — CIE-10
  | 'CNS_BO'    // Bolivia — Caja Nacional de Salud
  | 'INASES_BO' // Bolivia — INASES regulated procedures
  | 'SAFCI_BO'  // Bolivia — SAFCI publicly-funded
  | 'SUMI_BO'   // Bolivia — SUMI maternal/child
  | 'SSPAM_BO'  // Bolivia — SSPAM adult/elder
  | 'SNOMED_CT' // Crosswalk source only
  | 'CPT'       // US — Current Procedural Terminology
  | 'HCPCS'     // US — Healthcare Common Procedure Coding System
  | 'ICD10_PCS' // US — ICD-10 Procedure Coding System
  | 'MS_DRG'    // US — Medicare Severity DRG
  | 'NDC'       // US — National Drug Code
  | 'CCI'       // Canada — Canadian Classification of Health Interventions
  | 'OHIP'      // Canada — Ontario Health Insurance Plan
  | 'RAMQ'      // Canada — Régie de l'assurance maladie du Québec
  | 'MSP_BC'    // Canada — Medical Services Plan of BC
  | 'AHCIP'     // Canada — Alberta Health Care Insurance Plan
  | 'CUPS'      // Colombia — Clasificación Única de Procedimientos en Salud
  | 'ISS_SOAT_CO' // Colombia — ISS/SOAT tariff system
  | 'CIE9_MC_MX'  // Mexico — CIE-9-MC procedural classification
  | 'CAUSES'       // Mexico — Catálogo Universal de Servicios de Salud
  | 'TABULADOR_IMSS'; // Mexico — IMSS institutional fee schedule

/** Currency identifiers for all supported billing markets. */
export type BillingCurrencyCode = 'BRL' | 'ARS' | 'BOB' | 'USD' | 'CAD' | 'COP' | 'MXN';

/** @deprecated Use BillingCurrencyCode instead. */
export type LatAmCurrency = 'BRL' | 'ARS' | 'BOB';

/** Rate confidence level — mirrors RateConfidence Prisma enum. */
export type RateConfidenceLevel = 'CONTRACTED' | 'REFERENCE' | 'ESTIMATED';

/** A resolved billing code with metadata — output of SNOMED crosswalk. */
export interface ResolvedBillingCode {
  /** National billing code string (e.g., "1.01.01.09-6", "010101", "CON-001"). */
  code: string;
  /** Billing system that owns this code. */
  system: BillingSystemCode;
  /** Country for which this code is valid. */
  country: BillingCountry;
  /** ≤80 character human-readable description for UI. */
  shortDescription: string;
  /** Actuarial cost weight (0.0–1.0) for risk modeling. */
  actuarialWeight: number;
  /** SNOMED→billing mapping confidence (0.0–1.0). */
  confidence: number;
}

/** Payer-specific rate and coverage details for a billing code. */
export interface PayerRate {
  /** Negotiated or reference rate. */
  amount: number;
  /** Currency of the rate. */
  currency: LatAmCurrency;
  /** How reliable this rate is. */
  confidence: RateConfidenceLevel;
  /** Is this procedure covered at all? */
  isCovered: boolean;
  /** Annual or per-event coverage ceiling (null = unlimited). */
  coverageLimit: number | null;
  /** Fixed patient co-payment in local currency. */
  copayFlat: number | null;
  /** Percentage co-payment (0.0–1.0). */
  copayPercent: number | null;
  /** True if rate came from a fallback path (legacy data or reference table). */
  usedFallback: boolean;
}

/** Pre-authorization requirements for a procedure × insurer pair. */
export interface PayerAuthRequirement {
  /** Is prior authorization required? */
  required: boolean;
  /** Standard submission window in days before the procedure. */
  windowDays: number | null;
  /** Expedited/urgent pathway in hours. */
  urgentWindowHours: number | null;
  /** Documents the insurer requires (e.g., "REFERRAL_LETTER", "IMAGING_REPORT"). */
  requiredDocuments: string[];
  /** ICD-10/CIE-10 diagnosis codes that trigger this rule (empty = applies always). */
  requiredDiagnoses: string[];
  /** Human-readable notes from insurer guidelines. */
  notes: string | null;
}

/**
 * Full claim routing result — the output of BillingRouter.routeClaim().
 * Powers the inline billing widget in the clinical workflow and feeds
 * the enterprise export and TISS XML serializer.
 */
export interface ClaimRoutingResult {
  readonly __type: 'claim_routing_result';

  /** Input SNOMED concept ID. */
  snomedConceptId: string;
  /** Country the routing was performed for. */
  country: BillingCountry;

  /** Resolved national billing code (null if SNOMED not in crosswalk). */
  billingCode: string | null;
  /** Billing system for the resolved code. */
  billingSystem: BillingSystemCode | null;
  /** Short description of the resolved procedure. */
  procedureDescription: string | null;
  /** Actuarial cost weight (0.0–1.0). */
  actuarialWeight: number;

  /** Payer rate and coverage details. */
  rate: PayerRate | null;
  /** Prior authorization requirements. */
  priorAuth: PayerAuthRequirement;
  /** Clinician network status (null if clinicianId not provided). */
  clinicianNetwork: {
    isInNetwork: boolean;
    networkTier: string | null;
  } | null;

  /** Composite routing confidence (0.0–1.0). */
  routingConfidence: number;
  /** True if any component used fallback/legacy data. */
  usedFallback: boolean;
  /** ISO-8601 timestamp of routing resolution. */
  resolvedAt: string;
}

/**
 * Extended actuarial payload including tri-country billing context.
 * Extends ActuarialPayload with billing intelligence for enterprise API v2.
 */
export interface BillingEnrichedActuarialPayload extends ActuarialPayload {
  readonly __format: 'enterprise_risk_export_billing_v2';

  /** Per-country billing codes resolved for this assessment. */
  billingContext: {
    country: BillingCountry;
    codes: ResolvedBillingCode[];
    totalReferenceRateBRL: number | null;
    totalReferenceRateARS: number | null;
    totalReferenceRateBOB: number | null;
    totalReferenceRateUSD: number | null;
    totalReferenceRateCAD: number | null;
    totalReferenceRateCOP: number | null;
    totalReferenceRateMXN: number | null;
    insurerId: string | null;
    payerRates: PayerRate[];
    priorAuthRequired: boolean;
  }[];
}
