/**
 * Rules Engine Type Definitions
 *
 * Law 1 Compliance: Logic-as-Data (The Decapitation Rule)
 * All clinical rules, treatment protocols, and recommendation algorithms
 * stored as JSON in database - NOT TypeScript constants.
 *
 * The Check: "If the business requirement changes, do I have to merge a PR to fix it?"
 * Answer: No, because rules are in the database.
 *
 * UI Enablement: Schema supports a future "Rule Builder UI" for non-technical clinical admins.
 */

import type { EligibilityCriterion, TreatmentRecommendation } from './clinical';

// ═══════════════════════════════════════════════════════════════
// RULE TYPES (Database Enum)
// ═══════════════════════════════════════════════════════════════

export type RuleType =
  | 'SYMPTOM_DIAGNOSIS' // Symptom → Differential
  | 'TREATMENT_PROTOCOL' // Condition → Treatment
  | 'LAB_ACTION' // Lab result → Clinical action
  | 'DRUG_INTERACTION' // Drug pair → Alert
  | 'ALLERGY_CHECK' // Allergy + Med → Alert
  | 'VITAL_ALERT' // Vital trend → Alert
  | 'ADHERENCE_RISK' // Pattern → Risk score
  | 'CARE_GAP'; // Missing preventive care → Alert

// ═══════════════════════════════════════════════════════════════
// CLINICAL RULE (Logic-as-Data)
// ═══════════════════════════════════════════════════════════════

/**
 * ClinicalRule represents a single rule in the database.
 *
 * The conditions and actions are JSON (Logic-as-Data pattern).
 * This allows rules to be changed without code deployment.
 */
export interface ClinicalRule {
  id: string;

  // Rule identification
  ruleType: RuleType;
  name: string;
  version: string;

  // The rule itself (JSON - Logic-as-Data)
  conditions: EligibilityCriterion[];
  actions: RuleAction[];

  // Metadata
  source?: string; // "ACC/AHA 2022", "Internal"
  sourceUrl?: string;
  evidenceGrade?: 'A' | 'B' | 'C' | 'D' | 'expert-opinion';

  // Lifecycle
  effectiveDate: string;
  expirationDate?: string;
  isActive: boolean;

  // Audit
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// ═══════════════════════════════════════════════════════════════
// RULE ACTIONS
// ═══════════════════════════════════════════════════════════════

export interface RuleAction {
  type: 'alert' | 'recommendation' | 'order' | 'notification' | 'flag';
  priority: 'critical' | 'high' | 'medium' | 'low';
  payload: RuleActionPayload;
}

export type RuleActionPayload =
  | AlertActionPayload
  | RecommendationActionPayload
  | OrderActionPayload
  | NotificationActionPayload
  | FlagActionPayload;

export interface AlertActionPayload {
  type: 'alert';
  alertType: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface RecommendationActionPayload {
  type: 'recommendation';
  recommendation: TreatmentRecommendation;
}

export interface OrderActionPayload {
  type: 'order';
  orderType: 'lab' | 'medication' | 'referral' | 'imaging';
  orderCode: string;
  orderName: string;
  urgency: 'stat' | 'routine' | 'future';
}

export interface NotificationActionPayload {
  type: 'notification';
  channel: 'sms' | 'email' | 'push' | 'in-app';
  templateId: string;
  data: Record<string, unknown>;
}

export interface FlagActionPayload {
  type: 'flag';
  flagName: string;
  flagValue: boolean;
  expiresAt?: string;
}

// ═══════════════════════════════════════════════════════════════
// SYMPTOM-DIAGNOSIS MAP (Fallback Data)
// ═══════════════════════════════════════════════════════════════

/**
 * SymptomDiagnosisMap is used by the deterministic fallback engine.
 *
 * Law 3: Design for Failure
 * When AI fails, the fallback uses keyword matching against this data.
 */
export interface SymptomDiagnosisMap {
  id: string;

  // Symptom matching
  symptomKeywords: string[];
  symptomCategory: string; // "cardiovascular", "respiratory", etc.

  // Diagnosis output
  icd10Code: string;
  diagnosisName: string;
  baseProbability: number; // Prior probability before patient factors

  // Modifiers (JSON - how patient factors affect probability)
  probabilityModifiers: ProbabilityModifier;

  // Red flags and workup
  redFlags: string[];
  workupSuggestions: string[];

  // Metadata
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * ProbabilityModifier adjusts base probability based on patient factors.
 *
 * Example: { "age>65": 1.3, "diabetes": 1.5, "smoker": 1.4 }
 * Means: 65+ → multiply by 1.3, diabetic → multiply by 1.5
 */
export type ProbabilityModifier = Record<string, number>;

// ═══════════════════════════════════════════════════════════════
// TREATMENT PROTOCOL (Database Version)
// ═══════════════════════════════════════════════════════════════

/**
 * TreatmentProtocolDB is the database representation of a treatment protocol.
 *
 * Eligibility and recommendations are stored as JSON (Logic-as-Data).
 */
export interface TreatmentProtocolDB {
  id: string;

  // Identification
  conditionIcd10: string;
  conditionName: string;
  version: string;

  // Guideline source
  guidelineSource: string; // "ACC/AHA 2022"
  guidelineUrl?: string;
  guidelineCitation?: string;

  // The protocol (JSON - Logic-as-Data)
  eligibility: EligibilityCriterion[];
  recommendations: TreatmentRecommendation[];

  // Lifecycle
  effectiveDate: string;
  expirationDate?: string;
  isActive: boolean;

  // Audit
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  approvedBy?: string;
  approvedAt?: string;
}

// ═══════════════════════════════════════════════════════════════
// RULE EVALUATION RESULT
// ═══════════════════════════════════════════════════════════════

export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  conditionsEvaluated: number;
  conditionsPassed: number;
  actionsTriggered: RuleAction[];
  evaluatedAt: string;
  evaluationTimeMs: number;
}
