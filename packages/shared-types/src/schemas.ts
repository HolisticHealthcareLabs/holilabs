/**
 * Zod Schemas for Clinical Intelligence MVP
 *
 * Law 5 Compliance: Data Contract (Structured Payloads Only)
 * All AI outputs must be Zod-validated before touching database or rules engine.
 *
 * The Check: "Is every AI output validated against a Zod schema before it touches
 * the database or rules engine?" → Yes, via these schemas.
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════
// CONFIDENCE & PROCESSING SCHEMAS
// ═══════════════════════════════════════════════════════════════

export const confidenceLevelSchema = z.enum(['high', 'medium', 'low', 'fallback']);

export const processingMethodSchema = z.enum(['ai', 'fallback', 'hybrid']);

// ═══════════════════════════════════════════════════════════════
// SYMPTOM-TO-DIAGNOSIS SCHEMAS
// ═══════════════════════════════════════════════════════════════

export const symptomInputSchema = z.object({
  chiefComplaint: z.string().min(1, 'Chief complaint is required'),
  duration: z.string().optional(),
  severity: z.enum(['mild', 'moderate', 'severe']).optional(),
  associatedSymptoms: z.array(z.string()).optional().default([]),
  aggravatingFactors: z.array(z.string()).optional().default([]),
  relievingFactors: z.array(z.string()).optional().default([]),
});

export const differentialDiagnosisSchema = z.object({
  icd10Code: z.string().regex(/^[A-Z]\d{2}(\.\d{1,4})?$/, 'Invalid ICD-10 code format'),
  name: z.string().min(1),
  probability: z.number().min(0).max(1),
  confidence: confidenceLevelSchema,
  reasoning: z.string(),
  redFlags: z.array(z.string()).default([]),
  workupSuggestions: z.array(z.string()).default([]),
  source: z.enum(['ai', 'rule-based', 'hybrid']),
});

export const diagnosisOutputSchema = z.object({
  differentials: z.array(differentialDiagnosisSchema).max(10),
  urgency: z.enum(['emergent', 'urgent', 'routine']),
  processingMethod: processingMethodSchema,
  fallbackReason: z.string().optional(),
  timestamp: z.string().datetime(),
});

// ═══════════════════════════════════════════════════════════════
// TREATMENT PROTOCOL SCHEMAS
// ═══════════════════════════════════════════════════════════════

export const eligibilityCriterionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(['eq', 'gt', 'lt', 'gte', 'lte', 'in', 'notIn', 'contains']),
  value: z.unknown(),
  required: z.boolean().default(true),
});

export const medicationSchema = z.object({
  name: z.string().min(1),
  rxNormCode: z.string().optional(),
  dose: z.string(),
  frequency: z.string(),
  duration: z.string().optional(),
  route: z.string().optional(),
});

export const labOrderSchema = z.object({
  name: z.string().min(1),
  loincCode: z.string().optional(),
  frequency: z.string(),
  urgency: z.enum(['stat', 'routine', 'future']).optional(),
});

export const treatmentRecommendationSchema = z.object({
  id: z.string(),
  type: z.enum(['medication', 'lab', 'referral', 'lifestyle', 'monitoring']),
  priority: z.enum(['required', 'recommended', 'consider']),
  medication: medicationSchema.optional(),
  labOrder: labOrderSchema.optional(),
  rationale: z.string(),
  evidenceGrade: z.enum(['A', 'B', 'C', 'D', 'expert-opinion']),
  contraindications: z.array(z.string()).default([]),
});

export const treatmentProtocolSchema = z.object({
  id: z.string(),
  version: z.string(),
  conditionIcd10: z.string(),
  guidelineSource: z.string(),
  guidelineUrl: z.string().url().optional(),
  effectiveDate: z.string().datetime(),
  expirationDate: z.string().datetime().optional(),
  eligibilityCriteria: z.array(eligibilityCriterionSchema),
  recommendations: z.array(treatmentRecommendationSchema),
});

// ═══════════════════════════════════════════════════════════════
// MEDICATION ADHERENCE SCHEMAS
// ═══════════════════════════════════════════════════════════════

export const medicationAdherenceSchema = z.object({
  medicationId: z.string(),
  medicationName: z.string(),
  adherenceScore: z.number().min(0).max(100),
  daysSupplyRemaining: z.number().int().min(0),
  lastRefillDate: z.string().datetime().nullable(),
  expectedRefillDate: z.string().datetime().nullable(),
  missedRefills: z.number().int().min(0),
  riskFactors: z.array(z.string()).default([]),
});

export const adherenceInterventionSchema = z.object({
  type: z.enum(['reminder', 'education', 'simplification', 'cost', 'followup']),
  priority: z.enum(['high', 'medium', 'low']),
  description: z.string(),
  targetMedication: z.string().optional(),
});

export const adherenceAssessmentSchema = z.object({
  patientId: z.string(),
  overallScore: z.number().min(0).max(100),
  riskLevel: z.enum(['low', 'moderate', 'high']),
  medications: z.array(medicationAdherenceSchema),
  interventions: z.array(adherenceInterventionSchema),
  processingMethod: processingMethodSchema,
});

// ═══════════════════════════════════════════════════════════════
// AI SCRIBE OUTPUT SCHEMA
// ═══════════════════════════════════════════════════════════════

export const realTimeVitalsSchema = z.object({
  systolicBp: z.number().int().min(0).max(300).optional(),
  diastolicBp: z.number().int().min(0).max(200).optional(),
  heartRate: z.number().int().min(0).max(300).optional(),
  temperature: z.number().min(30).max(45).optional(),
  respiratoryRate: z.number().int().min(0).max(60).optional(),
  oxygenSaturation: z.number().min(0).max(100).optional(),
  weight: z.number().min(0).optional(),
  height: z.number().min(0).optional(),
  painLevel: z.number().int().min(0).max(10).optional(),
  bloodGlucose: z.number().min(0).optional(),
  recordedAt: z.string().datetime().optional(),
});

export const aiScribeOutputSchema = z.object({
  chiefComplaint: z.string().optional(),
  vitalSigns: realTimeVitalsSchema.optional(),
  symptoms: z.array(z.string()).optional(),
  medicationsMentioned: z.array(z.string()).optional(),
  allergiesMentioned: z.array(z.string()).optional(),
  assessmentNotes: z.string().optional(),
  planNotes: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  extractionQuality: z.enum(['complete', 'partial', 'uncertain']).optional(),
});

// ═══════════════════════════════════════════════════════════════
// PATIENT CONTEXT SCHEMAS
// ═══════════════════════════════════════════════════════════════

export const diagnosisSchema = z.object({
  id: z.string(),
  icd10Code: z.string(),
  name: z.string(),
  onsetDate: z.string().datetime().optional(),
  clinicalStatus: z.enum(['active', 'resolved', 'remission']).optional(),
  severity: z.enum(['mild', 'moderate', 'severe']).optional(),
});

export const patientMedicationSchema = z.object({
  id: z.string(),
  name: z.string(),
  rxNormCode: z.string().optional(),
  dose: z.string().optional(),
  frequency: z.string().optional(),
  route: z.string().optional(),
  status: z.string(),
  prescribedAt: z.string().datetime().optional(),
});

export const allergySchema = z.object({
  id: z.string(),
  allergen: z.string(),
  reaction: z.string().optional(),
  severity: z.enum(['mild', 'moderate', 'severe']).optional(),
  status: z.string(),
});

export const labResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  loincCode: z.string().optional(),
  value: z.number(),
  unit: z.string(),
  referenceRange: z.string().optional(),
  isAbnormal: z.boolean().optional(),
  resultDate: z.string().datetime(),
});

export const riskScoreSchema = z.object({
  id: z.string(),
  scoreType: z.string(),
  value: z.number(),
  interpretation: z.string().optional(),
  calculatedAt: z.string().datetime(),
});

export const patientContextSchema = z.object({
  patientId: z.string(),
  age: z.number().int().min(0).max(150),
  sex: z.enum(['M', 'F', 'O']),
  diagnoses: z.array(diagnosisSchema).optional(),
  medications: z.array(patientMedicationSchema).optional(),
  allergies: z.array(allergySchema).optional(),
  recentLabs: z.array(labResultSchema).optional(),
  riskScores: z.array(riskScoreSchema).optional(),
  hasDiabetes: z.boolean().optional(),
  hasHypertension: z.boolean().optional(),
  isSmoker: z.boolean().optional(),
});

// ═══════════════════════════════════════════════════════════════
// LLM-AS-JUDGE EVALUATION SCHEMAS (Law 6)
// ═══════════════════════════════════════════════════════════════

export const flaggedIssueSchema = z.object({
  type: z.enum(['hallucination', 'missing_field', 'clinical_error', 'formatting']),
  description: z.string(),
  severity: z.enum(['critical', 'major', 'minor']),
});

export const aiEvaluationSchema = z.object({
  hallucinationScore: z.number().min(0).max(1),
  completenessScore: z.number().min(0).max(1),
  clinicalAccuracyScore: z.number().min(0).max(1),
  reasoning: z.string(),
  flaggedIssues: z.array(flaggedIssueSchema),
});

// ═══════════════════════════════════════════════════════════════
// CLINICAL ALERT SCHEMA
// ═══════════════════════════════════════════════════════════════

export const clinicalAlertSchema = z.object({
  type: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  message: z.string(),
  items: z.array(z.string()).optional(),
  triggeredAt: z.string().datetime().optional(),
});

// ═══════════════════════════════════════════════════════════════
// CLINICAL DECISION RESULT SCHEMA (Master Output)
// ═══════════════════════════════════════════════════════════════

export const clinicalDecisionResultSchema = z.object({
  interactionId: z.string(),
  patientId: z.string(),
  diagnosis: z.object({
    data: diagnosisOutputSchema,
    method: processingMethodSchema,
    confidence: confidenceLevelSchema,
    aiLatencyMs: z.number().optional(),
    fallbackReason: z.string().optional(),
  }),
  treatments: z.array(z.object({
    data: z.array(treatmentRecommendationSchema),
    method: processingMethodSchema,
    confidence: confidenceLevelSchema,
    aiLatencyMs: z.number().optional(),
    fallbackReason: z.string().optional(),
  })),
  alerts: z.array(clinicalAlertSchema),
  processingMethods: z.object({
    diagnosis: processingMethodSchema,
    treatments: z.array(processingMethodSchema),
  }),
  timestamp: z.string().datetime(),
});

// ═══════════════════════════════════════════════════════════════
// TYPE EXPORTS (Inferred from Schemas)
// ═══════════════════════════════════════════════════════════════

export type SymptomInputSchema = z.infer<typeof symptomInputSchema>;
export type DifferentialDiagnosisSchema = z.infer<typeof differentialDiagnosisSchema>;
export type DiagnosisOutputSchema = z.infer<typeof diagnosisOutputSchema>;
export type TreatmentRecommendationSchema = z.infer<typeof treatmentRecommendationSchema>;
export type AdherenceAssessmentSchema = z.infer<typeof adherenceAssessmentSchema>;
export type AIScribeOutputSchema = z.infer<typeof aiScribeOutputSchema>;
export type PatientContextSchema = z.infer<typeof patientContextSchema>;
export type AIEvaluationSchema = z.infer<typeof aiEvaluationSchema>;
export type ClinicalDecisionResultSchema = z.infer<typeof clinicalDecisionResultSchema>;
