/**
 * Traffic Light Rule Template Types
 *
 * PROMPT-NATIVE ARCHITECTURE:
 * Rules are defined as templates, not TypeScript logic.
 * This enables non-engineers to review/modify rules,
 * and provides a clear audit trail for regulatory compliance.
 */

export type TrafficLightColor = 'RED' | 'YELLOW' | 'GREEN';
export type RuleCategory = 'CLINICAL' | 'ADMINISTRATIVE' | 'BILLING';
export type EvaluationAction = 'order' | 'prescription' | 'procedure' | 'diagnosis' | 'billing' | 'admission' | 'discharge';

/**
 * Rule Template Definition
 *
 * Each rule is defined declaratively with:
 * - Metadata for identification and categorization
 * - Conditions expressed in natural language or simple logic
 * - Messages in multiple languages (LGPD compliance)
 * - Regulatory references for audit trail
 */
export interface RuleTemplate {
  // ═══════════════════════════════════════════════════════════════
  // METADATA
  // ═══════════════════════════════════════════════════════════════
  id: string;
  name: string;
  version: string;
  category: RuleCategory;
  defaultColor: TrafficLightColor;
  isActive: boolean;

  // ═══════════════════════════════════════════════════════════════
  // APPLICABILITY
  // ═══════════════════════════════════════════════════════════════
  /** Which actions this rule applies to */
  applicableActions: EvaluationAction[];

  /** Optional: Only evaluate if these payload fields exist */
  requiredPayloadFields?: string[];

  // ═══════════════════════════════════════════════════════════════
  // CONDITION (Prompt-Native)
  // ═══════════════════════════════════════════════════════════════
  /**
   * Human-readable condition description.
   * Used for documentation and LLM-based evaluation.
   */
  conditionDescription: string;

  /**
   * Machine-evaluable condition logic.
   * JSON-Logic format for deterministic evaluation.
   * Falls back to LLM if not provided.
   */
  conditionLogic?: {
    type: 'json-logic' | 'function-name';
    value: Record<string, unknown> | string;
  };

  /**
   * Data dependencies for evaluation.
   * Tells the engine what patient data to fetch.
   */
  dataDependencies: Array<
    | 'allergies'
    | 'medications'
    | 'diagnoses'
    | 'labResults'
    | 'renalFunction'
    | 'pregnancy'
    | 'age'
    | 'weight'
    | 'tissCode'
    | 'priorAuth'
    | 'documents'
    | 'consents'
    | 'surgicalTeam'
  >;

  // ═══════════════════════════════════════════════════════════════
  // MESSAGES (LGPD: Must support Portuguese)
  // ═══════════════════════════════════════════════════════════════
  description: string;
  descriptionPortuguese: string;

  /** Template for dynamic message generation. Use {{variable}} syntax. */
  messageTemplate: string;
  messageTemplatePortuguese: string;

  // ═══════════════════════════════════════════════════════════════
  // REGULATORY & COMPLIANCE
  // ═══════════════════════════════════════════════════════════════
  regulatoryReference?: string;

  /** For billing rules: weight in glosa risk calculation */
  glosaRiskWeight?: number;

  /** For billing rules: expected denial code if violated */
  glosaCode?: string;

  // ═══════════════════════════════════════════════════════════════
  // OVERRIDE CONFIGURATION
  // ═══════════════════════════════════════════════════════════════
  canOverride: boolean;
  overrideRequires: 'justification' | 'supervisor' | 'blocked';

  /** Suggested correction for Break-Glass Chat */
  suggestedCorrectionTemplate?: string;
}

/**
 * Rule Evaluation Context
 *
 * The data provided to rule evaluation.
 */
export interface RuleEvaluationContext {
  patientId: string;
  action: EvaluationAction;
  payload: Record<string, unknown>;

  patientData: {
    allergies?: Array<{ allergen: string; severity: string; reaction?: string }>;
    medications?: Array<{ name: string; dose: string; frequency: string; startDate: string }>;
    diagnoses?: Array<{ icd10Code: string; description: string; date: string }>;
    labResults?: Array<{ name: string; value: number; unit: string; date: string }>;
    renalFunction?: { eGFR: number; creatinine: number };
    isPregnant?: boolean;
    age?: number;
    weight?: number;
  };

  billingData?: {
    tissCode?: string;
    planId?: string;
    priorAuthStatus?: 'pending' | 'approved' | 'denied' | 'not_required';
    priorAuthExpiry?: string;
    opmeItems?: string[];
    opmeAuthApproved?: boolean;
    billedAmount?: number;
  };

  documentationData?: {
    providedDocuments?: string[];
    informedConsentSigned?: boolean;
    lgpdConsentSigned?: boolean;
    patientIdentificationVerified?: boolean;
    preopEvaluationDate?: string;
    surgicalTeam?: {
      surgeon?: boolean;
      anesthesiologist?: boolean;
      assistant?: boolean;
    };
  };

  clinicId?: string;
}

/**
 * Rule Evaluation Result
 */
export interface RuleEvaluationResult {
  triggered: boolean;
  color: TrafficLightColor;
  message: string;
  messagePortuguese: string;
  evidence: string[];

  glosaRisk?: {
    probability: number;
    estimatedAmount: number;
    denialCode?: string;
  };

  suggestedCorrection?: string;
}

/**
 * Loaded Rule with Compiled Evaluator
 */
export interface CompiledRule extends RuleTemplate {
  evaluate: (context: RuleEvaluationContext) => Promise<RuleEvaluationResult | null>;
}
