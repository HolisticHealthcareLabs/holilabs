/**
 * Traffic Light System Types
 *
 * Core type definitions for the unified clinical, administrative,
 * and billing rules engine.
 *
 * LGPD Article 20 Compliance:
 * - Every signal includes regulatory reference
 * - Messages provided in Portuguese
 * - Evidence cited from patient record
 *
 * @module lib/traffic-light/types
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CORE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Traffic light colors indicating action requirements
 */
export type TrafficLightColor = 'RED' | 'YELLOW' | 'GREEN';

/**
 * Categories of rules in the system
 */
export type RuleCategory = 'CLINICAL' | 'ADMINISTRATIVE' | 'BILLING';

/**
 * Actions that can be evaluated by the traffic light
 */
export type EvaluationAction =
  | 'order'
  | 'prescription'
  | 'procedure'
  | 'diagnosis'
  | 'billing'
  | 'admission'
  | 'discharge';

/**
 * Override requirements for different signal severities
 */
export type OverrideRequirement = 'justification' | 'supervisor' | 'blocked';

// ═══════════════════════════════════════════════════════════════════════════════
// SIGNAL TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Estimated risk of billing denial (glosa)
 */
export interface GlosaRiskEstimate {
  /** Probability of denial (0-100%) */
  probability: number;
  /** Estimated R$ value at risk */
  estimatedAmount: number;
  /** Expected denial code if applicable */
  denialCode?: string;
  /** Reason for risk assessment */
  riskFactors?: string[];
}

/**
 * A single signal from a rule evaluation
 */
export interface TrafficLightSignal {
  /** Unique rule identifier */
  ruleId: string;
  /** Human-readable rule name */
  ruleName: string;
  /** Version of the rule for regression tracking */
  ruleVersionId?: string;
  /** Category of the rule */
  category: RuleCategory;
  /** Signal color */
  color: TrafficLightColor;

  /** Message in English */
  message: string;
  /** Message in Portuguese (LGPD requirement) */
  messagePortuguese: string;

  /** Regulatory reference (ANVISA RDC, ANS normative, TISS code) */
  regulatoryReference?: string;
  /** Evidence from patient record that triggered the rule */
  evidence: string[];

  /** Glosa risk estimate (for BILLING category) */
  estimatedGlosaRisk?: GlosaRiskEstimate;

  /** Suggested corrective action for Break-Glass Chat */
  suggestedCorrection?: string;
  /** Suggested correction in Portuguese */
  suggestedCorrectionPortuguese?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESULT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Aggregate glosa risk across all billing signals
 */
export interface AggregateGlosaRisk {
  /** Overall probability of at least one denial */
  probability: number;
  /** Total R$ amount at risk */
  totalAmountAtRisk: number;
  /** Highest risk denial code */
  highestRiskCode?: string;
  /** Number of billing issues detected */
  issueCount: number;
}

/**
 * Result of traffic light evaluation
 */
export interface TrafficLightResult {
  /** Overall color (worst from all signals) */
  color: TrafficLightColor;
  /** All triggered signals */
  signals: TrafficLightSignal[];

  /** Whether the action can be overridden */
  canOverride: boolean;
  /** What is required to override (if applicable) */
  overrideRequires?: OverrideRequirement;

  /** Aggregate glosa risk across all billing signals */
  totalGlosaRisk?: AggregateGlosaRisk;

  /** Whether Break-Glass Chat should be offered */
  needsChatAssistance: boolean;

  /** Summary counts by category */
  summary: {
    clinical: { red: number; yellow: number };
    administrative: { red: number; yellow: number };
    billing: { red: number; yellow: number };
  };

  /** Evaluation metadata */
  metadata: {
    evaluatedAt: string;
    latencyMs: number;
    rulesEvaluated: number;
    patientIdHash?: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Patient context for rule evaluation
 */
export interface PatientContext {
  id: string;
  /** Age in years */
  age?: number;
  /** Weight in kg */
  weight?: number;
  /** Biological sex */
  sex?: 'M' | 'F' | 'OTHER';
  /** Pregnancy status */
  isPregnant?: boolean;
  /** Known allergies */
  allergies?: Array<{
    allergen: string;
    severity: 'MILD' | 'MODERATE' | 'SEVERE';
    type: 'MEDICATION' | 'FOOD' | 'ENVIRONMENTAL' | 'OTHER';
  }>;
  /** Current medications */
  medications?: Array<{
    name: string;
    dose?: string;
    frequency?: string;
    isActive: boolean;
  }>;
  /** Active diagnoses */
  diagnoses?: Array<{
    icd10Code: string;
    description: string;
    status: 'ACTIVE' | 'RESOLVED' | 'CHRONIC';
  }>;
  /** Insurance/plan information */
  insurance?: {
    planId: string;
    planName: string;
    insurerId: string;
  };
  /** Recent lab results */
  labResults?: Array<{
    testName: string;
    value: number;
    unit: string;
    status: 'NORMAL' | 'ABNORMAL' | 'CRITICAL';
    resultDate: Date;
  }>;
}

/**
 * Action payload for evaluation
 */
export interface ActionPayload {
  /** TISS procedure code */
  tissCode?: string;
  /** Medication being prescribed */
  medication?: {
    name: string;
    dose?: string;
    frequency?: string;
    route?: string;
  };
  /** Diagnosis being recorded */
  diagnosis?: {
    icd10Code: string;
    description?: string;
  };
  /** Procedure being ordered */
  procedure?: {
    code: string;
    description?: string;
    quantity?: number;
  };
  /** Billed amount */
  billedAmount?: number;
  /** Additional context */
  [key: string]: unknown;
}

/**
 * Full evaluation context
 */
export interface EvaluationContext {
  /** Patient ID (will be hashed for RLHF) */
  patientId: string;
  /** Type of action being evaluated */
  action: EvaluationAction;
  /** Action-specific payload */
  payload: ActionPayload;
  /** Raw input context for RLHF capture */
  inputContextSnapshot: Record<string, unknown>;
  /** Pre-loaded patient context (optional, will be fetched if not provided) */
  patientContext?: PatientContext;
  /** Clinic ID for rule scoping */
  clinicId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE DEFINITION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Base rule definition
 */
export interface RuleDefinition {
  /** Unique rule identifier */
  id: string;
  /** Rule name */
  name: string;
  /** Rule category */
  category: RuleCategory;
  /** Default color when triggered */
  defaultColor: TrafficLightColor;
  /** Whether rule is active */
  isActive: boolean;

  /** English description */
  description: string;
  /** Portuguese description */
  descriptionPortuguese: string;

  /** Regulatory reference */
  regulatoryReference?: string;

  /** Glosa risk weight (0-1) for billing rules */
  glosaRiskWeight?: number;

  /** Suggested correction template */
  correctionTemplate?: string;
  /** Suggested correction in Portuguese */
  correctionTemplatePortuguese?: string;

  /** Rule evaluation function */
  evaluate: (
    context: EvaluationContext,
    patientContext: PatientContext
  ) => Promise<TrafficLightSignal | null>;
}

/**
 * Rule registry for managing active rules
 */
export interface RuleRegistry {
  clinical: RuleDefinition[];
  administrative: RuleDefinition[];
  billing: RuleDefinition[];
}
