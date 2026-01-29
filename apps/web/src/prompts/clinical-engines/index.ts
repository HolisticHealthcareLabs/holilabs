/**
 * Clinical Engine Prompt Templates Index
 *
 * PROMPT-NATIVE ARCHITECTURE:
 * All clinical decision logic for the three core engines is defined in
 * prompt templates, not TypeScript code.
 *
 * Benefits:
 * 1. Change clinical reasoning without code changes
 * 2. Version control prompts separately from application code
 * 3. A/B test different prompt strategies
 * 4. Regulatory audit trail of decision-making logic
 * 5. Non-engineers can review/modify clinical rules
 *
 * Engines migrated:
 * - Symptom-to-Diagnosis Engine
 * - Treatment Protocol Engine
 * - Medication Adherence Engine
 *
 * Usage:
 *   import {
 *     buildSymptomDiagnosisPrompt,
 *     buildTreatmentProtocolPrompt,
 *     buildMedicationAdherencePrompt,
 *   } from '@/prompts/clinical-engines';
 *
 * @module prompts/clinical-engines
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
  // Symptom Diagnosis Types
  SymptomDiagnosisRule,
  ProbabilityModifiers,
  SeverityModifiers,
  UrgencyRule,
  // Treatment Protocol Types
  TreatmentProtocolTemplate,
  EligibilityCriterion,
  TreatmentRecommendationTemplate,
  RenalDoseAdjustment,
  // Medication Adherence Types
  AdherenceThresholds,
  RiskFactorRule,
  InterventionTemplate,
  ComplexDosingPattern,
  // Output Types
  SymptomDiagnosisOutput,
  TreatmentRecommendationOutput,
  AdherenceAssessmentOutput,
} from './types';

// =============================================================================
// SCHEMA EXPORTS
// =============================================================================

export {
  symptomDiagnosisOutputSchema,
  treatmentRecommendationOutputSchema,
  adherenceAssessmentOutputSchema,
} from './types';

// =============================================================================
// SYMPTOM DIAGNOSIS EXPORTS
// =============================================================================

export {
  // Prompt builders
  buildSymptomDiagnosisPrompt,
  buildSymptomDiagnosisPromptWithExamples,
  // System prompt and format
  SYMPTOM_DIAGNOSIS_SYSTEM_PROMPT,
  SYMPTOM_DIAGNOSIS_OUTPUT_FORMAT,
  // Rules and data
  SYMPTOM_DIAGNOSIS_RULES,
  EMERGENT_ICD10_RULES,
  SEVERITY_MODIFIERS,
  CARDIOVASCULAR_ICD10_PREFIXES,
  RESPIRATORY_ICD10_PREFIXES,
  GI_ICD10_PREFIXES,
  // Few-shot examples
  SYMPTOM_DIAGNOSIS_EXAMPLES,
  // Rule loading
  getLoadedRules as getLoadedSymptomDiagnosisRules,
  getRuleTemplates as getSymptomDiagnosisRuleTemplates,
  reloadRulesFromDatabase as reloadSymptomDiagnosisRules,
  updateRules as updateSymptomDiagnosisRules,
  // Evaluation criteria
  SYMPTOM_DIAGNOSIS_EVALUATION_CRITERIA,
  // Context type
  type SymptomDiagnosisPromptContext,
} from './symptom-diagnosis.prompt';

// =============================================================================
// TREATMENT PROTOCOL EXPORTS
// =============================================================================

export {
  // Prompt builders
  buildTreatmentProtocolPrompt,
  buildTreatmentProtocolPromptWithExamples,
  // System prompt and format
  TREATMENT_PROTOCOL_SYSTEM_PROMPT,
  TREATMENT_PROTOCOL_OUTPUT_FORMAT,
  // Schemas
  treatmentRecommendationsArraySchema,
  // Protocols and data
  TREATMENT_PROTOCOLS,
  GENERIC_FALLBACK_RECOMMENDATIONS,
  RENAL_DOSE_ADJUSTMENTS,
  // Few-shot examples
  TREATMENT_PROTOCOL_EXAMPLES,
  // Protocol loading
  getLoadedProtocols,
  getProtocolTemplates,
  findMatchingProtocol,
  reloadProtocolsFromDatabase as reloadTreatmentProtocols,
  updateProtocols as updateTreatmentProtocols,
  // Evaluation criteria
  TREATMENT_PROTOCOL_EVALUATION_CRITERIA,
  // Context type
  type TreatmentProtocolPromptContext,
} from './treatment-protocol.prompt';

// =============================================================================
// MEDICATION ADHERENCE EXPORTS
// =============================================================================

export {
  // Prompt builders
  buildMedicationAdherencePrompt,
  buildMedicationAdherencePromptWithExamples,
  // System prompt and format
  MEDICATION_ADHERENCE_SYSTEM_PROMPT,
  MEDICATION_ADHERENCE_OUTPUT_FORMAT,
  // Thresholds and rules
  ADHERENCE_THRESHOLDS,
  RISK_FACTOR_RULES,
  INTERVENTION_TEMPLATES,
  COMPLEX_DOSING_PATTERNS,
  RISK_LEVEL_RULES,
  // Status classifications
  TAKEN_STATUSES,
  NOT_TAKEN_STATUSES,
  LATE_STATUS,
  // Few-shot examples
  MEDICATION_ADHERENCE_EXAMPLES,
  // Rule loading
  getLoadedThresholds,
  getLoadedRiskRules,
  getLoadedInterventions,
  getAdherenceTemplates,
  reloadAdherenceRulesFromDatabase as reloadAdherenceRules,
  updateThresholds,
  updateInterventionTemplates,
  // Helper functions
  isComplexDosingSchedule,
  calculateAdherenceScore,
  determineRiskLevel,
  // Evaluation criteria
  MEDICATION_ADHERENCE_EVALUATION_CRITERIA,
  // Context type
  type MedicationAdherencePromptContext,
} from './medication-adherence.prompt';
