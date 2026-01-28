/**
 * CDSS Rule Types (Prompt-Native)
 *
 * Type definitions for the Clinical Decision Support System rule templates.
 *
 * PROMPT-NATIVE ARCHITECTURE:
 * Rules are defined declaratively in templates, not TypeScript logic.
 * The engine loads and compiles rules at runtime, enabling:
 * - Rule updates without code deployments
 * - Auditable decision logic for LGPD/HIPAA compliance
 * - A/B testing of different rule strictness levels
 * - Non-engineers can review/modify rules
 *
 * @module prompts/cdss-rules/types
 */

// ═══════════════════════════════════════════════════════════════════════════
// INSIGHT TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Types of clinical insights
 */
export type InsightType =
  | 'risk_alert'
  | 'recommendation'
  | 'optimization'
  | 'interaction_warning'
  | 'diagnostic_support'
  | 'cost_saving';

/**
 * Priority levels for insights
 */
export type InsightPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Categories of insights
 */
export type InsightCategory = 'clinical' | 'operational' | 'financial';

/**
 * Action types that can be suggested
 */
export type ActionType =
  | 'view_patient'
  | 'view_medications'
  | 'view_lab'
  | 'order_lab'
  | 'prescribe_medication'
  | 'adjust_medication'
  | 'schedule_appointment'
  | 'start_protocol'
  | 'view_patient_list';

// ═══════════════════════════════════════════════════════════════════════════
// PATIENT CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Patient context for CDSS evaluation
 */
export interface CDSSPatientContext {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  age?: number;
  medications: Array<{
    id: string;
    name: string;
    dose: string;
    isActive: boolean;
  }>;
  vitals: Array<{
    temperature?: number;
    heartRate?: number;
    systolicBP?: number;
    diastolicBP?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
    createdAt: Date;
  }>;
  labResults: Array<{
    testName: string;
    value: string;
    unit: string;
    referenceRange: string;
    isAbnormal: boolean;
    isCritical: boolean;
    createdAt: Date;
  }>;
  allergies: Array<{
    allergen: string;
    reaction: string;
    severity: 'MILD' | 'MODERATE' | 'SEVERE';
  }>;
  diagnoses: Array<{
    icd10Code: string;
    description: string;
    diagnosedAt: Date;
  }>;
  lastVisit?: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// RULE TEMPLATE TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Evidence citation for clinical recommendations
 */
export interface EvidenceCitation {
  source: string;
  citation: string;
  url?: string;
}

/**
 * Suggested action for an insight
 */
export interface SuggestedAction {
  label: string;
  type: 'primary' | 'secondary';
  actionType: ActionType;
  metadataTemplate?: Record<string, string>;
}

/**
 * CDSS rule template definition
 */
export interface CDSSRuleTemplate {
  /** Unique rule identifier */
  id: string;
  /** Human-readable rule name */
  name: string;
  /** Rule version for tracking */
  version: string;
  /** Whether rule is active */
  isActive: boolean;

  /** Type of insight this rule generates */
  insightType: InsightType;
  /** Default priority when triggered */
  defaultPriority: InsightPriority;
  /** Category of the insight */
  category: InsightCategory;

  /** English description of the rule */
  description: string;
  /** Portuguese description (LGPD compliance) */
  descriptionPortuguese: string;

  /** Template for insight title (supports {{variables}}) */
  titleTemplate: string;
  /** Template for insight description (supports {{variables}}) */
  messageTemplate: string;
  /** Portuguese message template */
  messageTemplatePortuguese: string;

  /** Default confidence score (0-100) */
  defaultConfidence: number;

  /** Evidence citations for this rule */
  evidence?: EvidenceCitation[];

  /** Whether this insight is actionable */
  actionable: boolean;
  /** Suggested actions when triggered */
  actions?: SuggestedAction[];

  /** Data dependencies required for evaluation */
  dataDependencies: Array<'medications' | 'vitals' | 'labResults' | 'allergies' | 'diagnoses' | 'lastVisit'>;

  /**
   * Condition logic specification
   * - type: 'function-name' - name of evaluator function
   */
  conditionLogic: {
    type: 'function-name';
    value: string;
  };

  /** Metadata template for additional context */
  metadataTemplate?: Record<string, string>;
}

// ═══════════════════════════════════════════════════════════════════════════
// EVALUATION RESULT TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Result from rule evaluation
 */
export interface CDSSEvaluationResult {
  triggered: boolean;
  priority?: InsightPriority;
  title?: string;
  message?: string;
  messagePortuguese?: string;
  confidence?: number;
  evidence?: EvidenceCitation[];
  actions?: Array<{
    label: string;
    type: 'primary' | 'secondary';
    actionType: ActionType;
    metadata?: Record<string, any>;
  }>;
  metadata?: Record<string, any>;
}

/**
 * Compiled rule with evaluate function
 */
export interface CompiledCDSSRule extends CDSSRuleTemplate {
  evaluate: (context: CDSSPatientContext) => Promise<CDSSEvaluationResult | null>;
}

/**
 * AI Insight output format (matches existing service interface)
 */
export interface AIInsight {
  id: string;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  description: string;
  confidence: number;
  category: InsightCategory;
  patientId?: string;
  patientName?: string;
  evidence?: EvidenceCitation[];
  actionable: boolean;
  actions?: Array<{
    label: string;
    type: 'primary' | 'secondary';
    actionType?: string;
    metadata?: Record<string, any>;
  }>;
  metadata?: Record<string, any>;
}

// ═══════════════════════════════════════════════════════════════════════════
// EMBEDDED DATA TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Drug interaction definition
 */
export interface DrugInteraction {
  drug1: string;
  drug2: string;
  risk: string;
  priority: 'critical' | 'high';
}

/**
 * Drug class for duplicate therapy detection
 */
export interface DrugClass {
  name: string;
  drugs: string[];
}

/**
 * Lab monitoring requirement
 */
export interface LabMonitoringRequirement {
  drugs: string[];
  tests: string[];
  intervalDays: number;
  reason: string;
}
