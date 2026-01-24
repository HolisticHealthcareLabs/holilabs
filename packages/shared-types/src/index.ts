/**
 * @holilabs/shared-types
 *
 * Single Source of Truth for all HoliLabs type definitions.
 *
 * Law 2 Compliance: Interface First (The Shared Types Treaty)
 * This package is imported by API routes, React components, AND AI prompt schemas.
 *
 * The Check: "Do both the Scribe Agent and the Prevention Hub Agent
 * import PatientState from the same file?" → Yes, from here.
 *
 * Import patterns:
 *   import { PatientState, DiagnosisOutput } from '@holilabs/shared-types';
 *   import { AIScribeOutput } from '@holilabs/shared-types/ai';
 *   import type { ClinicalRule } from '@holilabs/shared-types/rules';
 */

// ═══════════════════════════════════════════════════════════════
// CLINICAL TYPES
// ═══════════════════════════════════════════════════════════════
export type {
  SymptomInput,
  ConfidenceLevel,
  DifferentialDiagnosis,
  DiagnosisOutput,
  TreatmentProtocol,
  EligibilityCriterion,
  TreatmentRecommendation,
  AdherenceAssessment,
  MedicationAdherence,
  AdherenceIntervention,
  ClinicalAlert,
} from './clinical';

// ═══════════════════════════════════════════════════════════════
// PATIENT TYPES
// ═══════════════════════════════════════════════════════════════
export type {
  Diagnosis,
  Medication,
  Allergy,
  LabResult,
  RiskScore,
  RealTimeVitals,
  PatientContext,
  MergedPatientState,
  PatientState, // Legacy alias
} from './patient';

// ═══════════════════════════════════════════════════════════════
// AI TYPES
// ═══════════════════════════════════════════════════════════════
export type {
  AIScribeOutput,
  ProcessingResult,
  FallbackConfig,
  AIProviderType,
  UnifiedAITask,
  TaskConfig,
  RetryConfig,
} from './ai';

export { RETRY_PRESETS } from './ai';

// ═══════════════════════════════════════════════════════════════
// RULES ENGINE TYPES
// ═══════════════════════════════════════════════════════════════
export type {
  RuleType,
  ClinicalRule,
  RuleAction,
  RuleActionPayload,
  AlertActionPayload,
  RecommendationActionPayload,
  OrderActionPayload,
  NotificationActionPayload,
  FlagActionPayload,
  SymptomDiagnosisMap,
  ProbabilityModifier,
  TreatmentProtocolDB,
  RuleEvaluationResult,
} from './rules';

// ═══════════════════════════════════════════════════════════════
// QUALITY TYPES
// ═══════════════════════════════════════════════════════════════
export type {
  AIEvaluation,
  FlaggedIssue,
  EvaluationContext,
  AIQualityMetrics,
  QualityDashboardMetrics,
  QualityAlert,
  QualityThresholds,
} from './quality';

export { DEFAULT_QUALITY_THRESHOLDS } from './quality';

// ═══════════════════════════════════════════════════════════════
// ZOD SCHEMAS (Law 5: Data Contract)
// ═══════════════════════════════════════════════════════════════
export {
  // Symptom/Diagnosis schemas
  symptomInputSchema,
  differentialDiagnosisSchema,
  diagnosisOutputSchema,
  // Treatment schemas
  eligibilityCriterionSchema,
  treatmentRecommendationSchema,
  treatmentProtocolSchema,
  // Adherence schemas
  adherenceAssessmentSchema,
  medicationAdherenceSchema,
  adherenceInterventionSchema,
  // AI Scribe schemas
  aiScribeOutputSchema,
  realTimeVitalsSchema,
  // Patient context schemas
  patientContextSchema,
  diagnosisSchema,
  patientMedicationSchema,
  allergySchema,
  labResultSchema,
  riskScoreSchema,
  // Quality/Evaluation schemas
  aiEvaluationSchema,
  flaggedIssueSchema,
  // Alert schemas
  clinicalAlertSchema,
  // Master output schema
  clinicalDecisionResultSchema,
  // Utility schemas
  confidenceLevelSchema,
  processingMethodSchema,
} from './schemas';
