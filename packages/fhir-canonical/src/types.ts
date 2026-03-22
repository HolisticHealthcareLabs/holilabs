/**
 * FHIR Canonical Types
 * Shared types for FHIR ↔ Canonical conversions
 */

import { z } from 'zod';

/**
 * CanonicalHealthRecord
 * Unified health data model for LATAM (Brazil-first, RNDS-compatible)
 *
 * INVARIANT: ELENA
 * - humanReviewRequired=true on every transformation
 * - No imputation of missing values — preserve data fidelity
 * - sourceAuthority+citationUrl required on every fact
 */
export const CanonicalPatientSchema = z.object({
  id: z.string().uuid(),
  cpf: z.string().regex(/^\d{11}$/).optional(), // Brazil: CPF (11 digits)
  npi: z.string().optional(), // US: National Provider Identifier
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().datetime(),
  gender: z.enum(['male', 'female', 'other', 'unknown']),
  email: z.string().email().optional(),
  phone: z.string().optional(),

  // Address (RNDS requirement)
  address: z.object({
    street: z.string(),
    number: z.string(),
    complement: z.string().optional(),
    neighborhood: z.string(),
    city: z.string(),
    state: z.string().length(2), // UF: SP, RJ, MG, etc.
    postalCode: z.string().regex(/^\d{8}$/), // CEP format
    country: z.string().default('BR'),
  }).optional(),

  // Static demographics (NOT per-encounter vitals)
  tipoSanguineo: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  localNascimento: z.string().optional(),
  ocupacao: z.string().optional(),

  // Source tracking (ELENA: sourceAuthority required)
  sourceAuthority: z.string().min(1),
  citationUrl: z.string().url().optional(),
  importedAt: z.string().datetime(),
  humanReviewRequired: z.boolean().default(true),
});

export const CanonicalObservationSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),

  // LOINC code for lab tests
  loincCode: z.string().regex(/^\d+-\d+$/).optional(), // e.g., "2345-7" (Glucose)
  snomedCode: z.string().optional(), // e.g., "365884004" (Finding)

  // Category (lab, vital, etc.)
  category: z.enum(['lab', 'vital-signs', 'imaging', 'procedure', 'social-history', 'other']),
  code: z.string(),
  display: z.string(),

  // Value
  value: z.union([
    z.number(),
    z.string(),
    z.boolean(),
  ]).optional(),
  unit: z.string().optional(), // e.g., "mg/dL"
  referenceRange: z.string().optional(),

  // Status
  status: z.enum(['preliminary', 'final', 'amended', 'corrected', 'cancelled', 'entered-in-error', 'unknown']).default('preliminary'),
  interpretation: z.enum(['low', 'normal', 'high', 'critical', 'critical-low', 'critical-high']).optional(),

  // Timing
  effectiveDateTime: z.string().datetime(),
  issued: z.string().datetime().optional(),

  // Source tracking (ELENA)
  sourceAuthority: z.string().min(1),
  citationUrl: z.string().url().optional(),
  humanReviewRequired: z.boolean().default(true),
});

export const CanonicalConditionSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),

  // ICD-10 code (RNDS requirement)
  icd10Code: z.string().regex(/^[A-Z]\d{2}(\.\d{1,2})?$/),
  display: z.string(),

  // Clinical details
  recordedDate: z.string().datetime(),
  clinicalStatus: z.enum(['active', 'recurrence', 'relapse', 'inactive', 'remission', 'resolved']).default('active'),
  verificationStatus: z.enum(['unconfirmed', 'provisional', 'differential', 'confirmed', 'refuted', 'entered-in-error']).default('unconfirmed'),

  // Source tracking (ELENA)
  sourceAuthority: z.string().min(1),
  citationUrl: z.string().url().optional(),
  humanReviewRequired: z.boolean().default(true),
});

export const CanonicalMedicationRequestSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),

  // Medication
  medicationCode: z.string(), // RxNorm or ANVISA code
  medicationDisplay: z.string(),

  // Dosage
  dosage: z.object({
    dose: z.number(),
    unit: z.string(), // "mg", "mcg", "ml", etc.
    frequency: z.string(), // "1x daily", "every 6 hours"
    route: z.enum(['oral', 'intravenous', 'intramuscular', 'subcutaneous', 'topical', 'rectal', 'other']).optional(),
  }).optional(),

  // Timing
  authoredOn: z.string().datetime(),
  effectivePeriod: z.object({
    start: z.string().datetime(),
    end: z.string().datetime().optional(),
  }).optional(),

  // Status
  status: z.enum(['active', 'on-hold', 'cancelled', 'completed', 'entered-in-error', 'stopped', 'unknown']).default('active'),
  intent: z.enum(['proposal', 'plan', 'order', 'original-order', 'reflex-order', 'filler-order', 'instance-order']).default('order'),

  // Source tracking (ELENA)
  sourceAuthority: z.string().min(1),
  citationUrl: z.string().url().optional(),
  humanReviewRequired: z.boolean().default(true),
});

export const CanonicalAllergyIntoleranceSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),

  // Substance
  substanceCode: z.string(),
  substanceDisplay: z.string(),

  // Allergy vs Intolerance
  type: z.enum(['allergy', 'intolerance']),
  category: z.enum(['food', 'medication', 'environment', 'biologic', 'other']),
  criticality: z.enum(['low', 'high', 'unable-to-assess']).default('low'),

  // Manifestations
  manifestations: z.array(z.string()).optional(), // e.g., ["rash", "anaphylaxis"]

  // Timing
  recordedDate: z.string().datetime(),
  onsetDateTime: z.string().datetime().optional(),

  // Status
  verificationStatus: z.enum(['unconfirmed', 'confirmed', 'refuted', 'entered-in-error']).default('unconfirmed'),
  clinicalStatus: z.enum(['active', 'inactive', 'resolved']).default('active'),

  // Source tracking (ELENA)
  sourceAuthority: z.string().min(1),
  citationUrl: z.string().url().optional(),
  humanReviewRequired: z.boolean().default(true),
});

/**
 * CanonicalHealthRecord
 * Complete health record combining all canonical types
 */
export const CanonicalHealthRecordSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),

  // Primary data
  patient: CanonicalPatientSchema,
  observations: z.array(CanonicalObservationSchema).default([]),
  conditions: z.array(CanonicalConditionSchema).default([]),
  medications: z.array(CanonicalMedicationRequestSchema).default([]),
  allergies: z.array(CanonicalAllergyIntoleranceSchema).default([]),

  // Metadata
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  humanReviewRequired: z.boolean().default(true),
  validationErrors: z.array(z.string()).default([]),
});

// Type exports
export type CanonicalPatient = z.infer<typeof CanonicalPatientSchema>;
export type CanonicalObservation = z.infer<typeof CanonicalObservationSchema>;
export type CanonicalCondition = z.infer<typeof CanonicalConditionSchema>;
export type CanonicalMedicationRequest = z.infer<typeof CanonicalMedicationRequestSchema>;
export type CanonicalAllergyIntolerance = z.infer<typeof CanonicalAllergyIntoleranceSchema>;
export type CanonicalHealthRecord = z.infer<typeof CanonicalHealthRecordSchema>;
