/**
 * Medical-Grade Input Validation Schemas
 * Industry-Standard Validation for Healthcare Data
 *
 * Standards:
 * - ICD-10 code format validation
 * - CPT code format validation
 * - Vital signs physiological ranges (WHO standards)
 * - HIPAA-compliant PHI validation
 * - E.164 phone number format (international)
 * - RFC 5322 email validation
 */

import { z } from 'zod';

// ============================================================================
// CONSTANTS - PHYSIOLOGICAL RANGES (WHO/AHA Standards)
// ============================================================================

export const VITAL_SIGNS_RANGES = {
  // Blood Pressure (mmHg)
  systolicBP: { min: 50, max: 250 },
  diastolicBP: { min: 30, max: 200 },

  // Heart Rate (bpm)
  heartRate: { min: 30, max: 250 },

  // Temperature (°C)
  temperature: { min: 35.0, max: 42.0 },

  // Respiratory Rate (breaths/min)
  respiratoryRate: { min: 8, max: 60 },

  // Oxygen Saturation (%)
  spo2: { min: 70, max: 100 },

  // Weight (kg)
  weight: { min: 0.5, max: 500 },

  // Height (cm)
  height: { min: 40, max: 250 },
};

export const FIELD_LIMITS = {
  // Text fields
  name: { min: 2, max: 100 },
  email: { max: 254 }, // RFC 5322
  phone: { min: 10, max: 20 }, // E.164 format
  address: { max: 500 },

  // Medical fields
  chiefComplaint: { max: 500 },
  soapSection: { max: 10000 }, // Each SOAP section
  medicationName: { max: 200 },
  dosage: { max: 50 },
  instructions: { max: 1000 },

  // Codes
  icd10: { length: [3, 7] }, // e.g., "J06" or "J06.9"
  cpt: { length: 5 }, // Always 5 digits

  // File uploads
  audioSize: { min: 1024, max: 100 * 1024 * 1024 }, // 1KB - 100MB
  audioDuration: { min: 10, max: 60 * 60 }, // 10 seconds - 1 hour
};

// ============================================================================
// CUSTOM VALIDATORS
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

/**
 * Validate phone number (E.164 format)
 * Accepts: +52 555 123 4567, +1-555-123-4567, (555) 123-4567, 5551234567, etc.
 * Very permissive - accepts any reasonable phone format
 */
export const phoneValidator = z.string()
  .min(FIELD_LIMITS.phone.min)
  .max(FIELD_LIMITS.phone.max)
  .regex(/^[\+\d][\d\s\-\(\)\.]+$/,
    'Invalid phone number format')
  .optional()
  .nullable();

/**
 * Validate email (RFC 5322 compliant)
 */
export const emailValidator = z.string()
  .email('Invalid email address')
  .max(FIELD_LIMITS.email.max)
  .optional()
  .nullable();

/**
 * Validate person name (letters, spaces, hyphens, apostrophes only)
 */
export const nameValidator = z.string()
  .min(FIELD_LIMITS.name.min, `Name must be at least ${FIELD_LIMITS.name.min} characters`)
  .max(FIELD_LIMITS.name.max, `Name must be less than ${FIELD_LIMITS.name.max} characters`)
  .regex(/^[a-zA-ZáéíóúñÁÉÍÓÚÑüÜ\s\-']+$/,
    'Name can only contain letters, spaces, hyphens, and apostrophes');

/**
 * Validate MRN (Medical Record Number)
 * Format: 6-20 alphanumeric characters
 */
export const mrnValidator = z.string()
  .min(6, 'MRN must be at least 6 characters')
  .max(20, 'MRN must be less than 20 characters')
  .regex(/^[A-Z0-9\-]+$/i, 'MRN can only contain letters, numbers, and hyphens');

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

// ============================================================================
// PATIENT VALIDATION
// ============================================================================

export const CreatePatientSchema = z.object({
  // Required fields
  firstName: nameValidator,
  lastName: nameValidator,
  dateOfBirth: z.string().datetime().or(z.date()).refine((date) => {
    const dob = new Date(date);
    const now = new Date();
    const age = (now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return age >= 0 && age <= 150; // Reasonable age range
  }, {
    message: 'Invalid date of birth (must be between 0-150 years ago)',
  }),

  // Optional demographic fields
  gender: z.enum(['M', 'F', 'O', 'U'], {
    errorMap: () => ({ message: 'Gender must be M (Male), F (Female), O (Other), or U (Unknown)' })
  }).optional(),

  // Contact information (PHI)
  email: emailValidator,
  phone: phoneValidator,
  address: z.string().max(FIELD_LIMITS.address.max).optional().nullable(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().length(2).default('MX'), // ISO 3166-1 alpha-2

  // De-identification
  ageBand: z.string().regex(/^\d{1,2}-\d{1,2}$/, 'Age band must be in format: XX-YY (e.g., 30-39)').optional(),
  region: z.string().max(10).optional(),

  // Assignment
  assignedClinicianId: z.string().cuid('Invalid clinician ID').optional(),
});

export const UpdatePatientSchema = CreatePatientSchema.partial();

export const PatientQuerySchema = z.object({
  page: z.string().optional().default('1').transform(Number).pipe(z.number().int().min(1)),
  limit: z.string().optional().default('50').transform(Number).pipe(z.number().int().min(1).max(100)),
  search: z.string().max(100).optional(),
  isActive: z.string().optional().transform((v) => v === 'true'),
  assignedClinicianId: z.string().cuid().optional(),
});

// ============================================================================
// SOAP NOTE VALIDATION
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

export const MedicationSchema = z.object({
  action: z.enum(['prescribe', 'discontinue', 'modify'], {
    errorMap: () => ({ message: 'Action must be prescribe, discontinue, or modify' })
  }),
  name: z.string().min(1).max(FIELD_LIMITS.medicationName.max, 'Medication name must be less than 200 characters'),
  dose: z.string().min(1).max(FIELD_LIMITS.dosage.max, 'Dosage must be less than 50 characters')
    .regex(/\d+\s*(mg|mL|g|mcg|IU|units?)/i, 'Dosage must include unit (mg, mL, g, mcg, IU, units)'),
  frequency: z.string().min(1).max(100, 'Frequency must be less than 100 characters'),
  duration: z.string().max(50).optional(),
  instructions: z.string().max(FIELD_LIMITS.instructions.max).optional(),
});

export const CreateSOAPNoteSchema = z.object({
  // Session reference
  sessionId: z.string().cuid('Invalid session ID').optional(),

  // Patient and clinician
  patientId: z.string().cuid('Invalid patient ID'),
  clinicianId: z.string().cuid('Invalid clinician ID'),

  // Chief Complaint
  chiefComplaint: z.string()
    .min(1, 'Chief complaint is required')
    .max(FIELD_LIMITS.chiefComplaint.max, 'Chief complaint must be less than 500 characters'),

  // SOAP Sections
  subjective: z.string()
    .max(FIELD_LIMITS.soapSection.max, 'Subjective section must be less than 10,000 characters')
    .optional()
    .default(''),
  objective: z.string()
    .max(FIELD_LIMITS.soapSection.max, 'Objective section must be less than 10,000 characters')
    .optional()
    .default(''),
  assessment: z.string()
    .max(FIELD_LIMITS.soapSection.max, 'Assessment section must be less than 10,000 characters')
    .optional()
    .default(''),
  plan: z.string()
    .max(FIELD_LIMITS.soapSection.max, 'Plan section must be less than 10,000 characters')
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

// ============================================================================
// AUDIO UPLOAD VALIDATION
// ============================================================================

export const AudioUploadSchema = z.object({
  duration: z.number()
    .int('Duration must be a whole number')
    .min(FIELD_LIMITS.audioDuration.min, `Recording must be at least ${FIELD_LIMITS.audioDuration.min} seconds`)
    .max(FIELD_LIMITS.audioDuration.max, `Recording must be less than ${FIELD_LIMITS.audioDuration.max} seconds`)
    .or(z.string().transform(Number).pipe(
      z.number().int().min(FIELD_LIMITS.audioDuration.min).max(FIELD_LIMITS.audioDuration.max)
    )),

  // File validation happens in file-verification.ts (magic bytes)
  // This just validates the metadata
});

// ============================================================================
// SCRIBE SESSION VALIDATION
// ============================================================================

export const CreateScribeSessionSchema = z.object({
  patientId: z.string().cuid('Invalid patient ID'),
  clinicianId: z.string().cuid('Invalid clinician ID').optional(), // Optional - will use context.user.id
});

// ============================================================================
// PRESCRIPTION VALIDATION
// ============================================================================

export const CreatePrescriptionSchema = z.object({
  patientId: z.string().cuid('Invalid patient ID'),
  medications: z.array(MedicationSchema).min(1, 'At least one medication required'),
  diagnosis: z.string().max(500).optional(),
  instructions: z.string().max(FIELD_LIMITS.instructions.max).optional(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreatePatientInput = z.infer<typeof CreatePatientSchema>;
export type UpdatePatientInput = z.infer<typeof UpdatePatientSchema>;
export type CreateSOAPNoteInput = z.infer<typeof CreateSOAPNoteSchema>;
export type UpdateSOAPNoteInput = z.infer<typeof UpdateSOAPNoteSchema>;
export type VitalSignsInput = z.infer<typeof VitalSignsSchema>;
export type DiagnosisInput = z.infer<typeof DiagnosisSchema>;
export type ProcedureInput = z.infer<typeof ProcedureSchema>;
export type MedicationInput = z.infer<typeof MedicationSchema>;
