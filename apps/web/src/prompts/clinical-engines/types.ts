/**
 * Clinical Engine Types (Prompt-Native)
 *
 * Type definitions for clinical decision support engine prompt templates.
 *
 * PROMPT-NATIVE ARCHITECTURE:
 * These types support moving hardcoded TypeScript rules into prompt-based
 * definitions so behavior can be changed without code changes.
 *
 * Benefits:
 * - Clinical logic updates without code deployments
 * - Auditable decision rules for LGPD/HIPAA compliance
 * - A/B testing of different diagnostic/treatment strategies
 * - Non-engineers can review/modify clinical rules
 *
 * @module prompts/clinical-engines/types
 */

import { z } from 'zod';

// =============================================================================
// SYMPTOM DIAGNOSIS TYPES
// =============================================================================

/**
 * Symptom-to-diagnosis mapping rule
 */
export interface SymptomDiagnosisRule {
  /** Unique rule identifier */
  id: string;
  /** ICD-10 code for the diagnosis */
  icd10Code: string;
  /** Human-readable diagnosis name */
  diagnosisName: string;
  /** Keywords that trigger this diagnosis */
  symptomKeywords: string[];
  /** Base probability (0-1) before modifiers */
  baseProbability: number;
  /** Red flags that indicate urgency */
  redFlags: string[];
  /** Suggested workup for this diagnosis */
  workupSuggestions: string[];
  /** Probability modifiers based on patient factors */
  probabilityModifiers: ProbabilityModifiers;
  /** Whether this rule is active */
  isActive: boolean;
}

/**
 * Probability modifiers for patient-specific adjustments
 */
export interface ProbabilityModifiers {
  /** Multiplier for age > 65 */
  'age>65'?: number;
  /** Multiplier for age > 80 */
  'age>80'?: number;
  /** Multiplier for age < 18 */
  'age<18'?: number;
  /** Multiplier for age < 5 */
  'age<5'?: number;
  /** Multiplier for male patients */
  'sex=male'?: number;
  /** Multiplier for female patients */
  'sex=female'?: number;
  /** Multiplier for diabetic patients */
  diabetes?: number;
  /** Multiplier for hypertensive patients */
  hypertension?: number;
  /** Multiplier for smokers */
  smoker?: number;
  /** Multiplier for cardiovascular disease */
  cardiovascular?: number;
  /** Multiplier for chronic kidney disease */
  ckd?: number;
  /** Multiplier for cancer patients */
  cancer?: number;
}

/**
 * Severity modifier values
 */
export interface SeverityModifiers {
  severe: number;
  moderate: number;
  mild: number;
}

/**
 * Urgency determination rule
 */
export interface UrgencyRule {
  /** ICD-10 prefix that indicates emergent condition */
  icd10Prefix: string;
  /** Condition name */
  conditionName: string;
  /** Urgency level */
  urgencyLevel: 'emergent' | 'urgent' | 'routine';
}

// =============================================================================
// TREATMENT PROTOCOL TYPES
// =============================================================================

/**
 * Eligibility criterion for treatment protocol
 */
export interface EligibilityCriterion {
  /** Field to evaluate (supports dot notation like 'labs.hba1c') */
  field: string;
  /** Comparison operator */
  operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'notIn' | 'contains';
  /** Value to compare against */
  value: unknown;
  /** Whether this criterion is required */
  required: boolean;
  /** Human-readable description */
  description?: string;
}

/**
 * Treatment recommendation definition
 */
export interface TreatmentRecommendationTemplate {
  /** Unique identifier */
  id: string;
  /** Type of recommendation */
  type: 'medication' | 'lab' | 'referral' | 'lifestyle' | 'monitoring';
  /** Priority level */
  priority: 'required' | 'recommended' | 'consider';
  /** Medication details (if type is medication) */
  medication?: {
    name: string;
    rxNormCode?: string;
    dose: string;
    frequency: string;
    duration?: string;
    route?: string;
  };
  /** Lab order details (if type is lab) */
  labOrder?: {
    name: string;
    loincCode?: string;
    frequency: string;
    urgency?: 'routine' | 'urgent';
  };
  /** Clinical rationale with guideline citation */
  rationale: string;
  /** Evidence grade */
  evidenceGrade: 'A' | 'B' | 'C' | 'D' | 'expert-opinion';
  /** Contraindications */
  contraindications: string[];
  /** Monitoring requirements */
  monitoringRequired?: string[];
}

/**
 * Treatment protocol definition
 */
export interface TreatmentProtocolTemplate {
  /** Unique protocol identifier */
  id: string;
  /** Protocol name */
  name: string;
  /** Protocol version */
  version: string;
  /** ICD-10 code for target condition */
  conditionIcd10: string;
  /** Condition name */
  conditionName: string;
  /** Guideline source citation */
  guidelineSource: string;
  /** Eligibility criteria */
  eligibility: EligibilityCriterion[];
  /** Treatment recommendations */
  recommendations: TreatmentRecommendationTemplate[];
  /** Whether protocol is active */
  isActive: boolean;
  /** Effective date */
  effectiveDate: Date;
  /** Expiration date (optional) */
  expirationDate?: Date;
}

/**
 * Dose adjustment rule based on renal function
 */
export interface RenalDoseAdjustment {
  /** eGFR threshold */
  eGFRThreshold: number;
  /** Comparison operator */
  operator: 'lt' | 'lte';
  /** Dose adjustment recommendation */
  adjustment: string;
}

// =============================================================================
// MEDICATION ADHERENCE TYPES
// =============================================================================

/**
 * Adherence thresholds for risk stratification
 */
export interface AdherenceThresholds {
  /** Good adherence threshold (default 80%) */
  good: number;
  /** Moderate adherence threshold (default 60%) */
  moderate: number;
  /** Measurement period in days (default 30) */
  measurementPeriodDays: number;
  /** Weight for late doses (default 0.75) */
  lateWeight: number;
}

/**
 * Risk factor detection rule
 */
export interface RiskFactorRule {
  /** Rule identifier */
  id: string;
  /** Condition to evaluate */
  condition: string;
  /** Threshold value */
  threshold: number;
  /** Comparison operator */
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  /** Risk factor description template */
  descriptionTemplate: string;
}

/**
 * Intervention template for adherence issues
 */
export interface InterventionTemplate {
  /** Intervention type */
  type: 'reminder' | 'education' | 'simplification' | 'cost' | 'followup';
  /** Priority level */
  priority: 'high' | 'medium' | 'low';
  /** Trigger condition */
  trigger: {
    /** Field to evaluate */
    field: string;
    /** Comparison operator */
    operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'contains' | 'in';
    /** Threshold or value */
    value: unknown;
  };
  /** Description template (supports {{variables}}) */
  descriptionTemplate: string;
  /** Target medication field (optional) */
  targetMedicationField?: string;
}

/**
 * Complex dosing schedule patterns
 */
export interface ComplexDosingPattern {
  /** Pattern identifier */
  pattern: string;
  /** Frequency codes that match this pattern */
  frequencyCodes: string[];
  /** Risk factor description */
  riskDescription: string;
}

// =============================================================================
// ZOD SCHEMAS FOR RUNTIME VALIDATION
// =============================================================================

/**
 * Schema for symptom diagnosis output
 */
export const symptomDiagnosisOutputSchema = z.object({
  differentials: z.array(
    z.object({
      icd10Code: z.string(),
      name: z.string(),
      probability: z.number().min(0).max(1),
      confidence: z.enum(['high', 'medium', 'low', 'fallback']),
      reasoning: z.string(),
      redFlags: z.array(z.string()),
      workupSuggestions: z.array(z.string()),
      source: z.enum(['ai', 'rule-based']),
    })
  ),
  urgency: z.enum(['emergent', 'urgent', 'routine']),
  processingMethod: z.enum(['ai', 'fallback', 'hybrid']),
  fallbackReason: z.string().optional(),
  timestamp: z.string(),
});

/**
 * Schema for treatment recommendation output
 */
export const treatmentRecommendationOutputSchema = z.object({
  id: z.string(),
  type: z.enum(['medication', 'lab', 'referral', 'lifestyle', 'monitoring']),
  priority: z.enum(['required', 'recommended', 'consider']),
  medication: z
    .object({
      name: z.string(),
      rxNormCode: z.string().optional(),
      dose: z.string(),
      frequency: z.string(),
      duration: z.string().optional(),
      route: z.string().optional(),
    })
    .optional(),
  labOrder: z
    .object({
      name: z.string(),
      loincCode: z.string().optional(),
      frequency: z.string(),
      urgency: z.enum(['routine', 'urgent']).optional(),
    })
    .optional(),
  rationale: z.string(),
  evidenceGrade: z.enum(['A', 'B', 'C', 'D', 'expert-opinion']),
  contraindications: z.array(z.string()),
  monitoringRequired: z.array(z.string()).optional(),
});

/**
 * Schema for adherence assessment output
 */
export const adherenceAssessmentOutputSchema = z.object({
  patientId: z.string(),
  overallScore: z.number().min(0).max(100),
  riskLevel: z.enum(['low', 'moderate', 'high']),
  medications: z.array(
    z.object({
      medicationId: z.string(),
      medicationName: z.string(),
      adherenceScore: z.number().min(0).max(100),
      daysSupplyRemaining: z.number(),
      lastRefillDate: z.string().nullable(),
      expectedRefillDate: z.string().nullable(),
      missedRefills: z.number(),
      riskFactors: z.array(z.string()),
    })
  ),
  interventions: z.array(
    z.object({
      type: z.enum(['reminder', 'education', 'simplification', 'cost', 'followup']),
      priority: z.enum(['high', 'medium', 'low']),
      description: z.string(),
      targetMedication: z.string().optional(),
    })
  ),
  processingMethod: z.enum(['ai', 'fallback']),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type SymptomDiagnosisOutput = z.infer<typeof symptomDiagnosisOutputSchema>;
export type TreatmentRecommendationOutput = z.infer<typeof treatmentRecommendationOutputSchema>;
export type AdherenceAssessmentOutput = z.infer<typeof adherenceAssessmentOutputSchema>;
