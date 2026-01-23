/**
 * @med-app/types
 *
 * Shared type definitions for the medical application platform.
 * This package serves as the single source of truth for all data contracts
 * between AI agents and services.
 *
 * @packageDocumentation
 */

// ============================================
// CORE CLINICAL INTERFACES
// ============================================

export interface Patient {
  id: string;
  mrn: string; // Medical Record Number
  demographics: PatientDemographics;
  vitals?: VitalSigns;
  conditions: string[]; // ICD-10 codes
  medications: Medication[];
  allergies: string[];
}

export interface PatientDemographics {
  age: number;
  sex: 'male' | 'female' | 'other';
  country: string;
  language: string;
  bmiCategory?: 'underweight' | 'normal' | 'overweight' | 'obese';
}

export interface VitalSigns {
  bp_systolic?: number;
  bp_diastolic?: number;
  heart_rate?: number;
  temperature?: number;
  weight_kg?: number;
  height_cm?: number;
  a1c?: number;
  ldl?: number;
  hdl?: number;
  creatinine?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  active: boolean;
  route?: string;
  prescribedBy?: string;
}

// ============================================
// SCRIBE → PREVENTION DATA CONTRACT
// ============================================

/**
 * PatientState - Output from AI Scribe, Input to Prevention Hub
 *
 * This is the critical data contract between the Scribe and Prevention agents.
 * All data must be structured JSON, NOT text blobs.
 */
export interface PatientState {
  vitals: Partial<VitalSigns>;
  meds: string[]; // Normalized medication names
  conditions: string[]; // ICD-10 codes or standardized names
  symptoms: string[];
  painPoints: PainPoint[];
  timestamp: string; // ISO 8601
  confidence: number; // 0-1, from transcription/extraction
}

export interface PainPoint {
  location: string;
  severity: number; // 1-10
  description: string;
  duration?: string;
  characteristics?: string[]; // e.g., 'sharp', 'dull', 'throbbing'
}

// ============================================
// CLINICAL PROTOCOL RULE SCHEMA (Logic-as-Data)
// ============================================

/**
 * ClinicalProtocolRule - Database-stored clinical protocol
 *
 * Replaces hardcoded TypeScript rules with JSON-Logic expressions
 * that can be updated without code deployment.
 */
export interface ClinicalProtocolRule {
  ruleId: string; // e.g., "PROTOCOL-DM-001"
  name: string;
  category: ProtocolCategory;
  version: string;
  source: ProtocolSource;
  logic: JSONLogicRule;
  validation: RuleValidation;
  metadata: RuleMetadata;
}

export type ProtocolCategory =
  | 'screening'
  | 'prevention'
  | 'drug_interaction'
  | 'diagnosis_support'
  | 'emergency_alert'
  | 'chronic_management'
  | 'vaccination';

export type ProtocolSource =
  | 'USPSTF'
  | 'WHO'
  | 'NHS'
  | 'ESC'
  | 'AHA'
  | 'ADA'
  | 'CDC'
  | 'custom';

export interface JSONLogicRule {
  if: LogicCondition;
  then: ClinicalAction;
  fallback: ClinicalAction;
}

export interface LogicCondition {
  operator: LogicOperator;
  variable?: string; // JSONPath: "vitals.a1c"
  value?: unknown;
  conditions?: LogicCondition[]; // For 'and'/'or' operators
}

export type LogicOperator =
  | '>'
  | '<'
  | '>='
  | '<='
  | '=='
  | '!='
  | 'and'
  | 'or'
  | 'not'
  | 'in'
  | '!in'
  | 'contains'
  | 'between';

export type ClinicalAction =
  | 'refer_endocrinology'
  | 'refer_cardiology'
  | 'refer_oncology'
  | 'refer_nephrology'
  | 'refer_gastroenterology'
  | 'order_lab'
  | 'order_imaging'
  | 'order_a1c_screening'
  | 'order_colonoscopy'
  | 'order_mammogram'
  | 'order_pap_smear'
  | 'order_lipid_panel'
  | 'flag_urgent'
  | 'flag_critical'
  | 'continue_monitoring'
  | 'schedule_followup'
  | 'alert_provider'
  | 'no_action';

export interface RuleValidation {
  minConfidence: number; // 0-1
  requireHumanReview: boolean;
  maxDataAgeHours?: number; // Data freshness requirement
  requiredFields?: string[]; // Fields that must be present
}

export interface RuleMetadata {
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  evidenceLevel: EvidenceLevel;
  references: string[];
  tags?: string[];
  isActive: boolean;
}

export type EvidenceLevel = 'A' | 'B' | 'C' | 'D' | 'I'; // Clinical evidence grades

// ============================================
// RULE ENGINE RESULT TYPES
// ============================================

export interface RuleEvaluationResult {
  action: ClinicalAction;
  protocol: string; // ruleId
  confidence: number;
  requiresReview: boolean;
  triggeredAt: string;
  inputHash?: string; // For deduplication
}

export interface RuleEngineOutput {
  actions: RuleEvaluationResult[];
  triggeredRules: string[];
  skippedRules: SkippedRule[];
  evaluationTimeMs: number;
}

export interface SkippedRule {
  ruleId: string;
  reason: 'missing_data' | 'low_confidence' | 'stale_data' | 'evaluation_error';
  details?: string;
}

// ============================================
// AI USAGE & QUALITY TRACKING
// ============================================

export interface AIUsageRecord {
  id: string;
  userId: string;
  organizationId?: string;
  provider: AIProvider;
  task: AITask;
  tokensInput: number;
  tokensOutput: number;
  costCents: number;
  latencyMs: number;
  success: boolean;
  qualityScore?: number; // 0-100, from LLM-as-a-Judge
  gradingNotes?: QualityGradingNotes;
  errorCode?: string;
  createdAt: string;
  gradedAt?: string;
  gradedBy?: string; // "gemini-flash" or "human"
}

export type AIProvider =
  | 'gemini'
  | 'claude'
  | 'openai'
  | 'deepgram'
  | 'whisper'
  | 'glm4'
  | 'biomistral';

export type AITask =
  | 'transcription'
  | 'clinical_notes'
  | 'diagnosis_support'
  | 'translation'
  | 'quality_grading'
  | 'patient_state_extraction'
  | 'symptom_extraction'
  | 'medication_extraction'
  | 'summarization';

// ============================================
// LLM-AS-A-JUDGE QA TYPES
// ============================================

export interface QualityGradingNotes {
  hallucinations: string[];
  criticalIssues: string[];
  recommendation: QualityRecommendation;
  dimensions: QualityDimension[];
}

export type QualityRecommendation = 'pass' | 'review_required' | 'fail';

export interface QualityDimension {
  name: string;
  score: number; // 0-100
  weight: number; // 0-1
  issues: string[];
}

export interface QualityRubric {
  dimensions: QualityRubricDimension[];
  passingScore: number;
  flagForReviewThreshold: number;
}

export interface QualityRubricDimension {
  name: string;
  weight: number;
  criteria: string[];
}

export interface QualityGradingResult {
  overallScore: number;
  dimensions: QualityDimension[];
  hallucinations: string[];
  criticalIssues: string[];
  recommendation: QualityRecommendation;
}

// ============================================
// TRANSCRIPT SESSION TYPES
// ============================================

export interface TranscriptSession {
  id: string;
  patientId: string;
  encounterDate: string;
  durationSecs: number;
  language: string;
  rawTranscript: string;
  processedText?: string;
  corrections?: TranscriptCorrection[];
  patientState?: PatientState;
  stateVersion?: string;
  provider: AIProvider;
  costCents: number;
  deidentified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TranscriptCorrection {
  original: string;
  corrected: string;
  correctedBy: string;
  correctedAt: string;
  category: CorrectionCategory;
}

export type CorrectionCategory =
  | 'medical_term'
  | 'medication_name'
  | 'dosage'
  | 'patient_name'
  | 'other';

// ============================================
// PREVENTION OUTCOME TYPES
// ============================================

export interface PreventionOutcome {
  id: string;
  patientId: string;
  interventionId: string;
  ruleId?: string; // Link to ClinicalProtocolRule
  scheduledDate: string;
  completedDate?: string;
  status: PreventionStatus;
  result?: Record<string, unknown>; // Lab values, screening results
  followUpNeeded: boolean;
  notes?: string;
  createdAt: string;
}

export type PreventionStatus =
  | 'scheduled'
  | 'completed'
  | 'missed'
  | 'declined'
  | 'cancelled'
  | 'in_progress';

// ============================================
// SAFE FALLBACK PATTERNS
// ============================================

/**
 * Creates an empty PatientState with default values.
 * Used as a safe fallback when extraction fails.
 */
export function createEmptyPatientState(confidence: number = 0): PatientState {
  return {
    vitals: {},
    meds: [],
    conditions: [],
    symptoms: [],
    painPoints: [],
    timestamp: new Date().toISOString(),
    confidence,
  };
}

/**
 * Creates a default rule evaluation result for fallback scenarios.
 */
export function createFallbackRuleResult(
  ruleId: string,
  fallbackAction: ClinicalAction
): RuleEvaluationResult {
  return {
    action: fallbackAction,
    protocol: ruleId,
    confidence: 0,
    requiresReview: true,
    triggeredAt: new Date().toISOString(),
  };
}

// ============================================
// TYPE GUARDS
// ============================================

export function isPatientState(obj: unknown): obj is PatientState {
  if (typeof obj !== 'object' || obj === null) return false;
  const ps = obj as PatientState;
  return (
    typeof ps.vitals === 'object' &&
    Array.isArray(ps.meds) &&
    Array.isArray(ps.conditions) &&
    Array.isArray(ps.symptoms) &&
    Array.isArray(ps.painPoints) &&
    typeof ps.timestamp === 'string' &&
    typeof ps.confidence === 'number'
  );
}

export function isClinicalAction(value: unknown): value is ClinicalAction {
  const validActions: ClinicalAction[] = [
    'refer_endocrinology',
    'refer_cardiology',
    'refer_oncology',
    'refer_nephrology',
    'refer_gastroenterology',
    'order_lab',
    'order_imaging',
    'order_a1c_screening',
    'order_colonoscopy',
    'order_mammogram',
    'order_pap_smear',
    'order_lipid_panel',
    'flag_urgent',
    'flag_critical',
    'continue_monitoring',
    'schedule_followup',
    'alert_provider',
    'no_action',
  ];
  return typeof value === 'string' && validActions.includes(value as ClinicalAction);
}

export function isValidConfidence(value: unknown): value is number {
  return typeof value === 'number' && value >= 0 && value <= 1;
}

export function isValidQualityScore(value: unknown): value is number {
  return typeof value === 'number' && value >= 0 && value <= 100;
}
