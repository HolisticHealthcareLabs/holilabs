/**
 * Prescription Schema
 *
 * Validates AI-generated prescription data.
 * Critical for patient safety - includes comprehensive validation rules.
 */

import { z } from 'zod';

/**
 * Drug strength/dose
 */
export const DrugDoseSchema = z.object({
  value: z.number().positive('Dose must be positive'),
  unit: z.enum([
    'mg', 'mcg', 'g', 'kg',
    'mL', 'L',
    'units', 'IU',
    '%',
    'mg/mL', 'mcg/mL',
    'mEq', 'mmol',
    'puffs', 'drops', 'tablets', 'capsules',
  ]),
});

/**
 * Route of administration
 */
export const RouteSchema = z.enum([
  'oral',
  'sublingual',
  'buccal',
  'intravenous',
  'intramuscular',
  'subcutaneous',
  'intradermal',
  'topical',
  'transdermal',
  'inhaled',
  'nasal',
  'ophthalmic',
  'otic',
  'rectal',
  'vaginal',
  'intrathecal',
  'epidural',
  'other',
]);

/**
 * Frequency of administration
 */
export const FrequencySchema = z.object({
  /** Textual description (e.g., "twice daily") */
  text: z.string(),
  /** Coded representation */
  code: z.enum([
    'QD',      // Once daily
    'BID',     // Twice daily
    'TID',     // Three times daily
    'QID',     // Four times daily
    'Q4H',     // Every 4 hours
    'Q6H',     // Every 6 hours
    'Q8H',     // Every 8 hours
    'Q12H',    // Every 12 hours
    'QHS',     // At bedtime
    'PRN',     // As needed
    'STAT',    // Immediately
    'QOD',     // Every other day
    'QWeek',   // Once weekly
    'QMonth',  // Once monthly
    'ONCE',    // One time only
    'OTHER',   // Other
  ]).optional(),
  /** Times per day */
  timesPerDay: z.number().int().positive().optional(),
  /** Specific times (24h format) */
  specificTimes: z.array(z.string().regex(/^([01]?\d|2[0-3]):([0-5]\d)$/)).optional(),
  /** PRN condition */
  prnReason: z.string().optional(),
  /** Maximum doses per day (for PRN) */
  maxDailyDoses: z.number().int().positive().optional(),
});

/**
 * Duration of treatment
 */
export const DurationSchema = z.object({
  value: z.number().positive(),
  unit: z.enum(['days', 'weeks', 'months', 'years', 'indefinite']),
  /** End date if known */
  endDate: z.string().datetime().optional(),
});

/**
 * Single medication in a prescription
 */
export const MedicationSchema = z.object({
  /** Medication name (brand or generic) */
  name: z.string().min(1, 'Medication name required'),
  /** Generic name if brand specified */
  genericName: z.string().optional(),
  /** RxNorm code */
  rxnormCode: z.string().optional(),
  /** NDC code */
  ndcCode: z.string().optional(),
  /** Dose */
  dose: DrugDoseSchema,
  /** Route */
  route: RouteSchema,
  /** Frequency */
  frequency: FrequencySchema,
  /** Duration */
  duration: DurationSchema.optional(),
  /** Dispense quantity */
  dispenseQuantity: z.number().int().positive(),
  /** Dispense unit */
  dispenseUnit: z.string(),
  /** Number of refills */
  refills: z.number().int().min(0).max(11, 'Maximum 11 refills allowed'),
  /** Allow generic substitution */
  substitutionAllowed: z.boolean().default(true),
  /** Indication/diagnosis */
  indication: z.string().optional(),
  /** ICD-10 code for indication */
  indicationCode: z.string().optional(),
  /** Special instructions */
  instructions: z.string().optional(),
  /** Patient instructions (SIG) */
  sig: z.string(),
  /** Pharmacy notes */
  pharmacyNotes: z.string().optional(),
  /** DEA schedule if controlled */
  deaSchedule: z.enum(['II', 'III', 'IV', 'V']).optional(),
  /** Requires prior authorization */
  priorAuthRequired: z.boolean().optional(),
});

/**
 * Complete prescription
 */
export const PrescriptionSchema = z.object({
  /** Prescription ID */
  id: z.string().optional(),
  /** Patient ID (de-identified) */
  patientId: z.string(),
  /** Prescriber ID */
  prescriberId: z.string(),
  /** Encounter ID */
  encounterId: z.string().optional(),
  /** Medications */
  medications: z.array(MedicationSchema).min(1, 'At least one medication required'),
  /** Prescription date */
  prescribedDate: z.string().datetime(),
  /** Valid until date */
  validUntil: z.string().datetime().optional(),
  /** Pharmacy (if specified) */
  pharmacy: z.object({
    name: z.string(),
    npi: z.string().optional(),
    phone: z.string().optional(),
    fax: z.string().optional(),
    address: z.string().optional(),
  }).optional(),
  /** Allergies checked */
  allergyCheckPerformed: z.boolean(),
  /** Interaction check performed */
  interactionCheckPerformed: z.boolean(),
  /** Warnings generated */
  warnings: z.array(z.object({
    type: z.enum(['allergy', 'interaction', 'contraindication', 'dosing', 'duplicate', 'other']),
    severity: z.enum(['info', 'warning', 'alert', 'critical']),
    message: z.string(),
    acknowledged: z.boolean().optional(),
  })).optional(),
  /** Clinical notes */
  clinicalNotes: z.string().optional(),
  /** AI metadata */
  aiMetadata: z.object({
    model: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
    processingTimeMs: z.number().optional(),
    requiresReview: z.boolean().optional(),
    reviewReasons: z.array(z.string()).optional(),
  }).optional(),
}).describe('Prescription');

export type DrugDose = z.infer<typeof DrugDoseSchema>;
export type Route = z.infer<typeof RouteSchema>;
export type Frequency = z.infer<typeof FrequencySchema>;
export type Duration = z.infer<typeof DurationSchema>;
export type Medication = z.infer<typeof MedicationSchema>;
export type Prescription = z.infer<typeof PrescriptionSchema>;

/**
 * Prescription validation result
 */
export const PrescriptionValidationResultSchema = z.object({
  valid: z.boolean(),
  prescription: PrescriptionSchema.optional(),
  errors: z.array(z.object({
    field: z.string(),
    message: z.string(),
    severity: z.enum(['error', 'warning']),
  })).optional(),
  warnings: z.array(z.object({
    type: z.string(),
    message: z.string(),
    recommendation: z.string().optional(),
  })).optional(),
  safetyChecks: z.object({
    allergyCheck: z.enum(['passed', 'failed', 'warning', 'not_performed']),
    interactionCheck: z.enum(['passed', 'failed', 'warning', 'not_performed']),
    dosingCheck: z.enum(['passed', 'failed', 'warning', 'not_performed']),
    duplicateCheck: z.enum(['passed', 'failed', 'warning', 'not_performed']),
    contraindicationCheck: z.enum(['passed', 'failed', 'warning', 'not_performed']),
  }),
}).describe('Prescription Validation Result');

export type PrescriptionValidationResult = z.infer<typeof PrescriptionValidationResultSchema>;
