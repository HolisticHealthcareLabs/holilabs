/**
 * Clinical Schema - Single Source of Truth
 * SOAP Notes, Vital Signs, Diagnoses, Procedures
 *
 * Standards:
 * - ICD-10 code format validation
 * - CPT code format validation
 * - Vital signs physiological ranges (WHO standards)
 */

import { z } from 'zod';
import { VITAL_SIGNS_RANGES, CLINICAL_FIELD_LIMITS, AUDIO_LIMITS } from './constants';

// ============================================================================
// MEDICAL CODE VALIDATORS
// ============================================================================

/**
 * Validate ICD-10 code format
 * Format: Letter + 2 digits + optional decimal + 1-2 digits
 * Examples: J06, J06.9, E11.65
 */
export const icd10CodeValidator = z.string().regex(
  /^[A-Z]\d{2}(\.\d{1,2})?$/,
  'Invalid ICD-10 code format (e.g., J06.9)'
);

/**
 * Validate CPT code format
 * Format: Exactly 5 digits
 * Examples: 99213, 99214, 80061
 */
export const cptCodeValidator = z.string().regex(
  /^\d{5}$/,
  'Invalid CPT code format (must be 5 digits)'
);

// ============================================================================
// VITAL SIGNS VALIDATION
// ============================================================================

/**
 * Blood Pressure validator
 * Format: "systolic/diastolic" (e.g., "120/80")
 */
export const bloodPressureValidator = z.string()
  .regex(/^\d{2,3}\/\d{2,3}$/, 'Blood pressure must be in format: systolic/diastolic (e.g., 120/80)')
  .refine((val) => {
    const [systolic, diastolic] = val.split('/').map(Number);
    return systolic >= VITAL_SIGNS_RANGES.systolicBP.min &&
           systolic <= VITAL_SIGNS_RANGES.systolicBP.max &&
           diastolic >= VITAL_SIGNS_RANGES.diastolicBP.min &&
           diastolic <= VITAL_SIGNS_RANGES.diastolicBP.max;
  }, {
    message: `Blood pressure must be ${VITAL_SIGNS_RANGES.systolicBP.min}-${VITAL_SIGNS_RANGES.systolicBP.max}/${VITAL_SIGNS_RANGES.diastolicBP.min}-${VITAL_SIGNS_RANGES.diastolicBP.max} mmHg`,
  })
  .optional();

/**
 * Heart Rate validator
 */
export const heartRateValidator = z.number()
  .int('Heart rate must be a whole number')
  .min(VITAL_SIGNS_RANGES.heartRate.min, `Heart rate must be at least ${VITAL_SIGNS_RANGES.heartRate.min} bpm`)
  .max(VITAL_SIGNS_RANGES.heartRate.max, `Heart rate must be less than ${VITAL_SIGNS_RANGES.heartRate.max} bpm`)
  .optional()
  .or(z.string().transform(Number).pipe(
    z.number().int().min(VITAL_SIGNS_RANGES.heartRate.min).max(VITAL_SIGNS_RANGES.heartRate.max)
  ).optional());

/**
 * Temperature validator (Celsius)
 * Also accepts Fahrenheit and auto-converts
 */
export const temperatureValidator = z.union([
  // Accept number (Celsius or Fahrenheit - auto-detect and convert)
  z.number().transform((val) => {
    // Auto-convert Fahrenheit to Celsius if > 50 (likely F, not C)
    const celsius = val > 50 ? (val - 32) * 5 / 9 : val;
    return celsius;
  }).pipe(
    z.number()
      .min(VITAL_SIGNS_RANGES.temperature.min, `Temperature must be at least ${VITAL_SIGNS_RANGES.temperature.min}°C`)
      .max(VITAL_SIGNS_RANGES.temperature.max, `Temperature must be less than ${VITAL_SIGNS_RANGES.temperature.max}°C`)
  ),
  // Accept string and convert to number
  z.string().transform((val) => {
    const num = parseFloat(val);
    // Auto-convert Fahrenheit to Celsius if > 50
    return num > 50 ? (num - 32) * 5 / 9 : num;
  }).pipe(
    z.number()
      .min(VITAL_SIGNS_RANGES.temperature.min, `Temperature must be at least ${VITAL_SIGNS_RANGES.temperature.min}°C`)
      .max(VITAL_SIGNS_RANGES.temperature.max, `Temperature must be less than ${VITAL_SIGNS_RANGES.temperature.max}°C`)
  ),
]).optional();

/**
 * Respiratory Rate validator
 */
export const respiratoryRateValidator = z.number()
  .int('Respiratory rate must be a whole number')
  .min(VITAL_SIGNS_RANGES.respiratoryRate.min, `Respiratory rate must be at least ${VITAL_SIGNS_RANGES.respiratoryRate.min} breaths/min`)
  .max(VITAL_SIGNS_RANGES.respiratoryRate.max, `Respiratory rate must be less than ${VITAL_SIGNS_RANGES.respiratoryRate.max} breaths/min`)
  .optional()
  .or(z.string().transform(Number).pipe(
    z.number().int().min(VITAL_SIGNS_RANGES.respiratoryRate.min).max(VITAL_SIGNS_RANGES.respiratoryRate.max)
  ).optional());

/**
 * SpO2 (Oxygen Saturation) validator
 */
export const spo2Validator = z.number()
  .int('SpO2 must be a whole number')
  .min(VITAL_SIGNS_RANGES.spo2.min, `SpO2 must be at least ${VITAL_SIGNS_RANGES.spo2.min}%`)
  .max(VITAL_SIGNS_RANGES.spo2.max, `SpO2 must be less than ${VITAL_SIGNS_RANGES.spo2.max}%`)
  .optional()
  .or(z.string().transform(Number).pipe(
    z.number().int().min(VITAL_SIGNS_RANGES.spo2.min).max(VITAL_SIGNS_RANGES.spo2.max)
  ).optional());

/**
 * Weight validator (kg)
 */
export const weightValidator = z.number()
  .min(VITAL_SIGNS_RANGES.weight.min, `Weight must be at least ${VITAL_SIGNS_RANGES.weight.min} kg`)
  .max(VITAL_SIGNS_RANGES.weight.max, `Weight must be less than ${VITAL_SIGNS_RANGES.weight.max} kg`)
  .optional()
  .or(z.string().transform(Number).pipe(
    z.number().min(VITAL_SIGNS_RANGES.weight.min).max(VITAL_SIGNS_RANGES.weight.max)
  ).optional());

/**
 * Vital Signs composite schema
 */
export const VitalSignsSchema = z.object({
  bp: bloodPressureValidator,
  hr: heartRateValidator,
  temp: temperatureValidator,
  rr: respiratoryRateValidator,
  spo2: spo2Validator,
  weight: weightValidator,
}).optional();

// Alternative vital signs schema for API compatibility
export const VitalSignsAltSchema = z.object({
  bloodPressure: z.string().optional(),
  heartRate: z.string().optional(),
  temperature: z.string().optional(),
  respiratoryRate: z.string().optional(),
  oxygenSaturation: z.string().optional(),
  weight: z.string().optional(),
}).optional();

// ============================================================================
// DIAGNOSIS & PROCEDURE SCHEMAS
// ============================================================================

export const DiagnosisSchema = z.object({
  icd10Code: icd10CodeValidator,
  description: z.string().min(1).max(200, 'Diagnosis description must be less than 200 characters'),
  isPrimary: z.boolean().default(false),
});

export const ProcedureSchema = z.object({
  cptCode: cptCodeValidator,
  description: z.string().min(1).max(200, 'Procedure description must be less than 200 characters'),
});

// ============================================================================
// MEDICATION SCHEMAS
// ============================================================================

export const MedicationSchema = z.object({
  action: z.enum(['prescribe', 'discontinue', 'modify'], {
    errorMap: () => ({ message: 'Action must be prescribe, discontinue, or modify' })
  }),
  name: z.string().min(1).max(CLINICAL_FIELD_LIMITS.medicationName.max, 'Medication name must be less than 200 characters'),
  dose: z.string().min(1).max(CLINICAL_FIELD_LIMITS.dosage.max, 'Dosage must be less than 50 characters')
    .regex(/\d+\s*(mg|mL|g|mcg|IU|units?)/i, 'Dosage must include unit (mg, mL, g, mcg, IU, units)'),
  frequency: z.string().min(1).max(100, 'Frequency must be less than 100 characters'),
  duration: z.string().max(50).optional(),
  instructions: z.string().max(CLINICAL_FIELD_LIMITS.instructions.max).optional(),
});

// Alternative medication schema for simpler API calls
export const MedicationItemSchema = z.object({
  name: z.string().min(1, 'Medication name is required'),
  dose: z.string().min(1, 'Dose is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  instructions: z.string().optional(),
  route: z.string().optional(),
  genericName: z.string().optional(),
});

// ============================================================================
// SOAP NOTE SCHEMAS
// ============================================================================

export const CreateSOAPNoteSchema = z.object({
  // Session reference
  sessionId: z.string().cuid('Invalid session ID').optional(),

  // Patient and clinician
  patientId: z.string().cuid('Invalid patient ID'),
  clinicianId: z.string().cuid('Invalid clinician ID'),

  // Chief Complaint
  chiefComplaint: z.string()
    .min(1, 'Chief complaint is required')
    .max(CLINICAL_FIELD_LIMITS.chiefComplaint.max, 'Chief complaint must be less than 500 characters'),

  // SOAP Sections
  subjective: z.string()
    .max(CLINICAL_FIELD_LIMITS.soapSection.max, 'Subjective section must be less than 10,000 characters')
    .optional()
    .default(''),
  objective: z.string()
    .max(CLINICAL_FIELD_LIMITS.soapSection.max, 'Objective section must be less than 10,000 characters')
    .optional()
    .default(''),
  assessment: z.string()
    .max(CLINICAL_FIELD_LIMITS.soapSection.max, 'Assessment section must be less than 10,000 characters')
    .optional()
    .default(''),
  plan: z.string()
    .max(CLINICAL_FIELD_LIMITS.soapSection.max, 'Plan section must be less than 10,000 characters')
    .optional()
    .default(''),

  // Confidence scores (AI-generated)
  subjectiveConfidence: z.number().min(0).max(1).optional(),
  objectiveConfidence: z.number().min(0).max(1).optional(),
  assessmentConfidence: z.number().min(0).max(1).optional(),
  planConfidence: z.number().min(0).max(1).optional(),
  overallConfidence: z.number().min(0).max(1).optional(),

  // Vital Signs
  vitalSigns: VitalSignsSchema,

  // Diagnoses (structured)
  diagnoses: z.array(DiagnosisSchema).max(20, 'Maximum 20 diagnoses allowed').optional().default([]),

  // Procedures
  procedures: z.array(ProcedureSchema).max(20, 'Maximum 20 procedures allowed').optional().default([]),

  // Medications
  medications: z.array(MedicationSchema).max(30, 'Maximum 30 medications allowed').optional().default([]),

  // AI metadata
  model: z.string().optional(),
  tokensUsed: z.number().int().optional(),
  processingTime: z.number().int().optional(),
});

export const UpdateSOAPNoteSchema = CreateSOAPNoteSchema.partial().omit({
  sessionId: true,
  patientId: true,
  clinicianId: true,
});

// Alternative clinical note schema for API compatibility
export const CreateClinicalNoteSchema = z.object({
  patientId: z.string().cuid('Invalid patient ID'),
  clinicianId: z.string().cuid('Invalid clinician ID'),
  noteType: z.enum(['FOLLOW_UP', 'INITIAL_CONSULT', 'PROCEDURE', 'EMERGENCY']),
  chiefComplaint: z.string().min(1, 'Chief complaint is required'),
  subjective: z.string().optional().default(''),
  objective: z.string().optional().default(''),
  assessment: z.string().optional().default(''),
  plan: z.string().optional().default(''),
  vitalSigns: VitalSignsAltSchema,
  diagnoses: z.array(z.string()).optional().default([]),
  procedures: z.array(z.string()).optional().default([]),
});

export const ClinicalNoteQuerySchema = z.object({
  patientId: z.string().cuid().optional(),
  clinicianId: z.string().cuid().optional(),
  noteType: z.enum(['FOLLOW_UP', 'INITIAL_CONSULT', 'PROCEDURE', 'EMERGENCY']).optional(),
  limit: z.string().optional().default('50').transform(Number),
});

// ============================================================================
// SCRIBE SESSION SCHEMAS
// ============================================================================

export const CreateScribeSessionSchema = z.object({
  patientId: z.string().cuid('Invalid patient ID'),
  clinicianId: z.string().cuid('Invalid clinician ID').optional(), // Optional - will use context.user.id
});

export const AudioUploadSchema = z.object({
  duration: z.number()
    .int('Duration must be a whole number')
    .min(AUDIO_LIMITS.duration.min, `Recording must be at least ${AUDIO_LIMITS.duration.min} seconds`)
    .max(AUDIO_LIMITS.duration.max, `Recording must be less than ${AUDIO_LIMITS.duration.max} seconds`)
    .or(z.string().transform(Number).pipe(
      z.number().int().min(AUDIO_LIMITS.duration.min).max(AUDIO_LIMITS.duration.max)
    )),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateSOAPNoteInput = z.infer<typeof CreateSOAPNoteSchema>;
export type UpdateSOAPNoteInput = z.infer<typeof UpdateSOAPNoteSchema>;
export type CreateClinicalNoteInput = z.infer<typeof CreateClinicalNoteSchema>;
export type VitalSignsInput = z.infer<typeof VitalSignsSchema>;
export type DiagnosisInput = z.infer<typeof DiagnosisSchema>;
export type ProcedureInput = z.infer<typeof ProcedureSchema>;
export type MedicationInput = z.infer<typeof MedicationSchema>;
export type AudioUploadInput = z.infer<typeof AudioUploadSchema>;
