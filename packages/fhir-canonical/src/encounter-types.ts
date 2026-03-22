/**
 * Clinical Encounter Layer — Zod Schemas
 *
 * Separate from types.ts (FHIR canonical model).
 * These schemas model the clinical encounter workflow:
 * anamnese_inicial (first visit) and evolucao (follow-up).
 *
 * ELENA: sourceAuthority + humanReviewRequired on all clinical data
 * CYRUS: tenantId on all data operations
 * RUTH: ICD-10 codes required on conditions
 */

import { z } from 'zod';

const ICD10_REGEX = /^[A-Z]\d{2}(\.\d{1,2})?$/;

// ─────────────────────────────────────────────────────────────────────────────
// CHIEF COMPLAINT
// ─────────────────────────────────────────────────────────────────────────────

export const ChiefComplaintSchema = z.object({
  id: z.string().uuid(),
  encounterId: z.string().uuid(),
  patientId: z.string().uuid(),
  description: z.string().min(1),
  icdCode: z.string().regex(ICD10_REGEX),
  icdDisplay: z.string(),
  onsetDate: z.string().datetime().optional(),
  duration: z.string().optional(),
  aggravatingFactors: z.array(z.string()).optional(),
  relievingFactors: z.array(z.string()).optional(),
  chronologyNotes: z.string().optional(),
  isPrimary: z.boolean().default(false),
  sourceAuthority: z.string().min(1),
  humanReviewRequired: z.boolean().default(true),
});

export type ChiefComplaint = z.infer<typeof ChiefComplaintSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// FAMILY MEMBER HISTORY
// ─────────────────────────────────────────────────────────────────────────────

export const FamilyMemberHistorySchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  relationship: z.enum([
    'father', 'mother', 'sibling',
    'maternal_grandmother', 'maternal_grandfather',
    'paternal_grandmother', 'paternal_grandfather',
    'child', 'other',
  ]),
  relationshipDetail: z.string().optional(),
  isLiving: z.boolean().optional(),
  ageAtDeath: z.number().optional(),
  causeOfDeath: z.string().optional(),
  causeOfDeathIcd: z.string().regex(ICD10_REGEX).optional(),
  conditions: z.array(z.object({
    icdCode: z.string().regex(ICD10_REGEX),
    display: z.string(),
    ageAtDiagnosis: z.number().optional(),
  })),
  sourceAuthority: z.string().min(1),
  humanReviewRequired: z.boolean().default(true),
});

export type FamilyMemberHistory = z.infer<typeof FamilyMemberHistorySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEMS REVIEW
// ─────────────────────────────────────────────────────────────────────────────

export const SystemsReviewSchema = z.object({
  id: z.string().uuid(),
  encounterId: z.string().uuid(),
  patientId: z.string().uuid(),
  systems: z.array(z.object({
    system: z.enum([
      'head', 'eyes', 'ears', 'nose_sinuses', 'mouth_throat', 'neck',
      'skin', 'chest_respiratory', 'cardiovascular', 'gastrointestinal',
      'genitourinary', 'musculoskeletal', 'neurological', 'psychiatric',
      'endocrine', 'hematologic',
    ]),
    reviewed: z.boolean().default(false),
    normal: z.boolean().default(true),
    findings: z.string().optional(),
  })),
  unreviewedConfirmed: z.boolean().default(false),
  confirmedBy: z.string().optional(),
  confirmedAt: z.string().datetime().optional(),
  sourceAuthority: z.string().min(1),
  humanReviewRequired: z.boolean().default(true),
});

export type SystemsReview = z.infer<typeof SystemsReviewSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// ENCOUNTER VITALS
// ─────────────────────────────────────────────────────────────────────────────

export const EncounterVitalsSchema = z.object({
  peso: z.number().positive().optional(),
  altura: z.number().positive().optional(),
  bmi: z.number().positive().optional(),
  bloodPressureSystolic: z.number().optional(),
  bloodPressureDiastolic: z.number().optional(),
  heartRate: z.number().optional(),
  temperature: z.number().optional(),
  spO2: z.number().optional(),
});

export type EncounterVitals = z.infer<typeof EncounterVitalsSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// ENCOUNTER
// ─────────────────────────────────────────────────────────────────────────────

export const EncounterSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  tenantId: z.string().min(1),
  type: z.enum(['anamnese_inicial', 'evolucao']),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),

  chiefComplaints: z.array(ChiefComplaintSchema).max(4),

  comorbidities: z.array(z.object({
    conditionId: z.string().uuid(),
    icdCode: z.string().regex(ICD10_REGEX),
    display: z.string(),
    clinicalStatus: z.enum(['active', 'remission', 'resolved']),
    relationToChiefComplaint: z.string().optional(),
  })).default([]),

  familyHistory: z.array(FamilyMemberHistorySchema).default([]),

  systemsReview: SystemsReviewSchema.optional(),

  anamnese: z.string().optional(),

  evolucao: z.object({
    previousEncounterId: z.string().uuid().optional(),
    progressSummary: z.string(),
    improvementAreas: z.array(z.string()).optional(),
    worseningAreas: z.array(z.string()).optional(),
    newComplaints: z.array(ChiefComplaintSchema).optional(),
  }).optional(),

  physicalExam: z.object({
    findings: z.string().optional(),
    attachments: z.array(z.object({
      id: z.string().uuid(),
      filename: z.string(),
      mimeType: z.string(),
      url: z.string(),
      type: z.enum(['lab_report', 'imaging', 'pathology', 'specialist_report', 'other']),
      uploadedAt: z.string().datetime(),
    })).default([]),
  }).optional(),

  vitals: EncounterVitalsSchema.optional(),

  assessment: z.string().optional(),
  plan: z.string().optional(),

  preventionAlerts: z.array(z.string().uuid()).default([]),

  laudoMedicoGenerated: z.boolean().default(false),
  laudoMedicoUrl: z.string().optional(),

  practitionerId: z.string().uuid(),
  practitionerName: z.string(),
  facilityId: z.string().optional(),

  sourceAuthority: z.string().min(1),
  humanReviewRequired: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Encounter = z.infer<typeof EncounterSchema>;
