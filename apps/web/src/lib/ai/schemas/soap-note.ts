/**
 * SOAP Note Schema
 *
 * Validates AI-generated SOAP (Subjective, Objective, Assessment, Plan) notes.
 * Ensures clinical documentation follows standard format.
 */

import { z } from 'zod';

/**
 * Individual finding/symptom in subjective section
 */
export const SubjectiveFindingSchema = z.object({
  symptom: z.string().min(1, 'Symptom description required'),
  duration: z.string().optional(),
  severity: z.enum(['mild', 'moderate', 'severe']).optional(),
  location: z.string().optional(),
  quality: z.string().optional(),
  aggravatingFactors: z.array(z.string()).optional(),
  relievingFactors: z.array(z.string()).optional(),
});

/**
 * Vital signs in objective section
 */
export const VitalSignsSchema = z.object({
  bloodPressure: z.string().optional(),
  heartRate: z.number().optional(),
  temperature: z.number().optional(),
  respiratoryRate: z.number().optional(),
  oxygenSaturation: z.number().optional(),
  weight: z.number().optional(),
  height: z.number().optional(),
  bmi: z.number().optional(),
});

/**
 * Physical exam finding
 */
export const ExamFindingSchema = z.object({
  system: z.string().min(1),
  finding: z.string().min(1),
  normal: z.boolean(),
  notes: z.string().optional(),
});

/**
 * Diagnosis with ICD-10 code
 */
export const DiagnosisSchema = z.object({
  description: z.string().min(1, 'Diagnosis description required'),
  icd10Code: z.string().regex(/^[A-Z]\d{2}(\.\d{1,4})?$/, 'Invalid ICD-10 code format').optional(),
  status: z.enum(['confirmed', 'suspected', 'ruled_out', 'chronic', 'acute']).optional(),
  primary: z.boolean().optional(),
});

/**
 * Plan item
 */
export const PlanItemSchema = z.object({
  type: z.enum([
    'medication',
    'lab_order',
    'imaging',
    'referral',
    'procedure',
    'education',
    'follow_up',
    'lifestyle',
    'other',
  ]),
  description: z.string().min(1),
  details: z.string().optional(),
  priority: z.enum(['routine', 'urgent', 'stat']).optional(),
  dueDate: z.string().optional(),
});

/**
 * Complete SOAP Note schema
 */
export const SOAPNoteSchema = z.object({
  // Metadata
  encounterId: z.string().optional(),
  generatedAt: z.string().datetime().optional(),
  confidence: z.number().min(0).max(1).optional(),

  // Subjective - Patient's report
  subjective: z.object({
    chiefComplaint: z.string().min(1, 'Chief complaint required'),
    historyOfPresentIllness: z.string().min(1, 'HPI required'),
    reviewOfSystems: z.record(z.string(), z.boolean()).optional(),
    findings: z.array(SubjectiveFindingSchema).optional(),
    patientReportedMedications: z.array(z.string()).optional(),
    allergies: z.array(z.string()).optional(),
    socialHistory: z.string().optional(),
    familyHistory: z.string().optional(),
  }),

  // Objective - Clinical findings
  objective: z.object({
    vitalSigns: VitalSignsSchema.optional(),
    physicalExam: z.array(ExamFindingSchema).optional(),
    labResults: z.array(z.object({
      test: z.string(),
      value: z.string(),
      unit: z.string().optional(),
      reference: z.string().optional(),
      abnormal: z.boolean().optional(),
    })).optional(),
    imagingResults: z.array(z.object({
      type: z.string(),
      findings: z.string(),
      impression: z.string().optional(),
    })).optional(),
    generalAppearance: z.string().optional(),
  }),

  // Assessment - Clinical interpretation
  assessment: z.object({
    diagnoses: z.array(DiagnosisSchema).min(1, 'At least one diagnosis required'),
    differentialDiagnoses: z.array(z.string()).optional(),
    clinicalImpression: z.string().optional(),
    riskFactors: z.array(z.string()).optional(),
  }),

  // Plan - Treatment plan
  plan: z.object({
    items: z.array(PlanItemSchema).min(1, 'At least one plan item required'),
    followUp: z.object({
      interval: z.string(),
      reason: z.string().optional(),
    }).optional(),
    patientEducation: z.array(z.string()).optional(),
    precautions: z.array(z.string()).optional(),
  }),

  // AI-specific metadata
  aiMetadata: z.object({
    model: z.string().optional(),
    processingTimeMs: z.number().optional(),
    warnings: z.array(z.string()).optional(),
    requiresReview: z.boolean().optional(),
  }).optional(),
}).describe('SOAP Note');

export type SOAPNote = z.infer<typeof SOAPNoteSchema>;
export type SubjectiveFinding = z.infer<typeof SubjectiveFindingSchema>;
export type VitalSigns = z.infer<typeof VitalSignsSchema>;
export type ExamFinding = z.infer<typeof ExamFindingSchema>;
export type Diagnosis = z.infer<typeof DiagnosisSchema>;
export type PlanItem = z.infer<typeof PlanItemSchema>;

/**
 * Partial SOAP note for incremental generation
 */
export const PartialSOAPNoteSchema = SOAPNoteSchema.partial();
export type PartialSOAPNote = z.infer<typeof PartialSOAPNoteSchema>;
