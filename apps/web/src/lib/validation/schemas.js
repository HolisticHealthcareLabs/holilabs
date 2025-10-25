"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatePrescriptionSchema = exports.CreateScribeSessionSchema = exports.AudioUploadSchema = exports.UpdateSOAPNoteSchema = exports.CreateSOAPNoteSchema = exports.MedicationSchema = exports.ProcedureSchema = exports.DiagnosisSchema = exports.PatientQuerySchema = exports.UpdatePatientSchema = exports.CreatePatientSchema = exports.ibgeCodeValidator = exports.cnesValidator = exports.cpfValidator = exports.cnsValidator = exports.VitalSignsSchema = exports.weightValidator = exports.spo2Validator = exports.respiratoryRateValidator = exports.temperatureValidator = exports.heartRateValidator = exports.bloodPressureValidator = exports.mrnValidator = exports.nameValidator = exports.emailValidator = exports.phoneValidator = exports.cptCodeValidator = exports.icd10CodeValidator = exports.FIELD_LIMITS = exports.VITAL_SIGNS_RANGES = void 0;
const zod_1 = require("zod");
// ============================================================================
// CONSTANTS - PHYSIOLOGICAL RANGES (WHO/AHA Standards)
// ============================================================================
exports.VITAL_SIGNS_RANGES = {
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
exports.FIELD_LIMITS = {
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
exports.icd10CodeValidator = zod_1.z.string().regex(/^[A-Z]\d{2}(\.\d{1,2})?$/, 'Invalid ICD-10 code format (e.g., J06.9)');
/**
 * Validate CPT code format
 * Format: Exactly 5 digits
 * Examples: 99213, 99214, 80061
 */
exports.cptCodeValidator = zod_1.z.string().regex(/^\d{5}$/, 'Invalid CPT code format (must be 5 digits)');
/**
 * Validate phone number (E.164 format)
 * Accepts: +52 555 123 4567, +1-555-123-4567, (555) 123-4567, 5551234567, etc.
 * Very permissive - accepts any reasonable phone format
 */
exports.phoneValidator = zod_1.z.string()
    .min(exports.FIELD_LIMITS.phone.min)
    .max(exports.FIELD_LIMITS.phone.max)
    .regex(/^[\+\d][\d\s\-\(\)\.]+$/, 'Invalid phone number format')
    .optional()
    .nullable();
/**
 * Validate email (RFC 5322 compliant)
 */
exports.emailValidator = zod_1.z.string()
    .email('Invalid email address')
    .max(exports.FIELD_LIMITS.email.max)
    .optional()
    .nullable();
/**
 * Validate person name (letters, spaces, hyphens, apostrophes only)
 */
exports.nameValidator = zod_1.z.string()
    .min(exports.FIELD_LIMITS.name.min, `Name must be at least ${exports.FIELD_LIMITS.name.min} characters`)
    .max(exports.FIELD_LIMITS.name.max, `Name must be less than ${exports.FIELD_LIMITS.name.max} characters`)
    .regex(/^[a-zA-ZáéíóúñÁÉÍÓÚÑüÜ\s\-']+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes');
/**
 * Validate MRN (Medical Record Number)
 * Format: 6-20 alphanumeric characters
 */
exports.mrnValidator = zod_1.z.string()
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
exports.bloodPressureValidator = zod_1.z.string()
    .regex(/^\d{2,3}\/\d{2,3}$/, 'Blood pressure must be in format: systolic/diastolic (e.g., 120/80)')
    .refine((val) => {
    const [systolic, diastolic] = val.split('/').map(Number);
    return systolic >= exports.VITAL_SIGNS_RANGES.systolicBP.min &&
        systolic <= exports.VITAL_SIGNS_RANGES.systolicBP.max &&
        diastolic >= exports.VITAL_SIGNS_RANGES.diastolicBP.min &&
        diastolic <= exports.VITAL_SIGNS_RANGES.diastolicBP.max;
}, {
    message: `Blood pressure must be ${exports.VITAL_SIGNS_RANGES.systolicBP.min}-${exports.VITAL_SIGNS_RANGES.systolicBP.max}/${exports.VITAL_SIGNS_RANGES.diastolicBP.min}-${exports.VITAL_SIGNS_RANGES.diastolicBP.max} mmHg`,
})
    .optional();
/**
 * Heart Rate validator
 */
exports.heartRateValidator = zod_1.z.number()
    .int('Heart rate must be a whole number')
    .min(exports.VITAL_SIGNS_RANGES.heartRate.min, `Heart rate must be at least ${exports.VITAL_SIGNS_RANGES.heartRate.min} bpm`)
    .max(exports.VITAL_SIGNS_RANGES.heartRate.max, `Heart rate must be less than ${exports.VITAL_SIGNS_RANGES.heartRate.max} bpm`)
    .optional()
    .or(zod_1.z.string().transform(Number).pipe(zod_1.z.number().int().min(exports.VITAL_SIGNS_RANGES.heartRate.min).max(exports.VITAL_SIGNS_RANGES.heartRate.max)).optional());
/**
 * Temperature validator (Celsius)
 * Also accepts Fahrenheit and auto-converts
 */
exports.temperatureValidator = zod_1.z.union([
    // Accept number (Celsius or Fahrenheit - auto-detect and convert)
    zod_1.z.number().transform((val) => {
        // Auto-convert Fahrenheit to Celsius if > 50 (likely F, not C)
        const celsius = val > 50 ? (val - 32) * 5 / 9 : val;
        return celsius;
    }).pipe(zod_1.z.number()
        .min(exports.VITAL_SIGNS_RANGES.temperature.min, `Temperature must be at least ${exports.VITAL_SIGNS_RANGES.temperature.min}°C`)
        .max(exports.VITAL_SIGNS_RANGES.temperature.max, `Temperature must be less than ${exports.VITAL_SIGNS_RANGES.temperature.max}°C`)),
    // Accept string and convert to number
    zod_1.z.string().transform((val) => {
        const num = parseFloat(val);
        // Auto-convert Fahrenheit to Celsius if > 50
        return num > 50 ? (num - 32) * 5 / 9 : num;
    }).pipe(zod_1.z.number()
        .min(exports.VITAL_SIGNS_RANGES.temperature.min, `Temperature must be at least ${exports.VITAL_SIGNS_RANGES.temperature.min}°C`)
        .max(exports.VITAL_SIGNS_RANGES.temperature.max, `Temperature must be less than ${exports.VITAL_SIGNS_RANGES.temperature.max}°C`)),
]).optional();
/**
 * Respiratory Rate validator
 */
exports.respiratoryRateValidator = zod_1.z.number()
    .int('Respiratory rate must be a whole number')
    .min(exports.VITAL_SIGNS_RANGES.respiratoryRate.min, `Respiratory rate must be at least ${exports.VITAL_SIGNS_RANGES.respiratoryRate.min} breaths/min`)
    .max(exports.VITAL_SIGNS_RANGES.respiratoryRate.max, `Respiratory rate must be less than ${exports.VITAL_SIGNS_RANGES.respiratoryRate.max} breaths/min`)
    .optional()
    .or(zod_1.z.string().transform(Number).pipe(zod_1.z.number().int().min(exports.VITAL_SIGNS_RANGES.respiratoryRate.min).max(exports.VITAL_SIGNS_RANGES.respiratoryRate.max)).optional());
/**
 * SpO2 (Oxygen Saturation) validator
 */
exports.spo2Validator = zod_1.z.number()
    .int('SpO2 must be a whole number')
    .min(exports.VITAL_SIGNS_RANGES.spo2.min, `SpO2 must be at least ${exports.VITAL_SIGNS_RANGES.spo2.min}%`)
    .max(exports.VITAL_SIGNS_RANGES.spo2.max, `SpO2 must be less than ${exports.VITAL_SIGNS_RANGES.spo2.max}%`)
    .optional()
    .or(zod_1.z.string().transform(Number).pipe(zod_1.z.number().int().min(exports.VITAL_SIGNS_RANGES.spo2.min).max(exports.VITAL_SIGNS_RANGES.spo2.max)).optional());
/**
 * Weight validator (kg)
 */
exports.weightValidator = zod_1.z.number()
    .min(exports.VITAL_SIGNS_RANGES.weight.min, `Weight must be at least ${exports.VITAL_SIGNS_RANGES.weight.min} kg`)
    .max(exports.VITAL_SIGNS_RANGES.weight.max, `Weight must be less than ${exports.VITAL_SIGNS_RANGES.weight.max} kg`)
    .optional()
    .or(zod_1.z.string().transform(Number).pipe(zod_1.z.number().min(exports.VITAL_SIGNS_RANGES.weight.min).max(exports.VITAL_SIGNS_RANGES.weight.max)).optional());
/**
 * Vital Signs composite schema
 */
exports.VitalSignsSchema = zod_1.z.object({
    bp: exports.bloodPressureValidator,
    hr: exports.heartRateValidator,
    temp: exports.temperatureValidator,
    rr: exports.respiratoryRateValidator,
    spo2: exports.spo2Validator,
    weight: exports.weightValidator,
}).optional();
// ============================================================================
// PATIENT VALIDATION
// ============================================================================
// Brazilian identifier validators
exports.cnsValidator = zod_1.z.string()
    .length(15, 'CNS must be exactly 15 digits')
    .regex(/^\d{15}$/, 'CNS must contain only digits')
    .optional();
exports.cpfValidator = zod_1.z.string()
    .length(11, 'CPF must be exactly 11 digits')
    .regex(/^\d{11}$/, 'CPF must contain only digits')
    .optional();
exports.cnesValidator = zod_1.z.string()
    .length(7, 'CNES must be exactly 7 digits')
    .regex(/^\d{7}$/, 'CNES must contain only digits')
    .optional();
exports.ibgeCodeValidator = zod_1.z.string()
    .length(7, 'IBGE municipality code must be exactly 7 digits')
    .regex(/^\d{7}$/, 'IBGE code must contain only digits')
    .optional();
exports.CreatePatientSchema = zod_1.z.object({
    // Required fields
    firstName: exports.nameValidator,
    lastName: exports.nameValidator,
    dateOfBirth: zod_1.z.string().datetime().or(zod_1.z.date()).refine((date) => {
        const dob = new Date(date);
        const now = new Date();
        const age = (now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        return age >= 0 && age <= 150; // Reasonable age range
    }, {
        message: 'Invalid date of birth (must be between 0-150 years ago)',
    }),
    // Medical Record Numbers
    mrn: exports.mrnValidator,
    externalMrn: zod_1.z.string().max(50).optional(),
    // Optional demographic fields
    gender: zod_1.z.enum(['M', 'F', 'O', 'U'], {
        errorMap: () => ({ message: 'Gender must be M (Male), F (Female), O (Other), or U (Unknown)' })
    }).optional(),
    // Contact information (PHI)
    email: exports.emailValidator,
    phone: exports.phoneValidator,
    address: zod_1.z.string().max(exports.FIELD_LIMITS.address.max).optional().nullable(),
    city: zod_1.z.string().max(100).optional(),
    state: zod_1.z.string().max(100).optional(),
    postalCode: zod_1.z.string().max(20).optional(),
    country: zod_1.z.string().length(2).default('BR'), // ISO 3166-1 alpha-2 (Brazil for Pequeno Cotolêngo)
    // De-identification
    ageBand: zod_1.z.string().regex(/^\d{1,2}-\d{1,2}$/, 'Age band must be in format: XX-YY (e.g., 30-39)').optional(),
    region: zod_1.z.string().max(10).optional(),
    // Brazilian National Identifiers
    cns: exports.cnsValidator,
    cpf: exports.cpfValidator,
    rg: zod_1.z.string().max(20).optional(),
    municipalityCode: exports.ibgeCodeValidator,
    healthUnitCNES: exports.cnesValidator,
    susPacientId: zod_1.z.string().max(50).optional(),
    // Palliative Care Fields
    isPalliativeCare: zod_1.z.boolean().default(false),
    comfortCareOnly: zod_1.z.boolean().default(false),
    advanceDirectivesStatus: zod_1.z.enum(['NOT_COMPLETED', 'IN_PROGRESS', 'COMPLETED', 'REVIEWED_ANNUALLY']).optional(),
    advanceDirectivesDate: zod_1.z.string().datetime().or(zod_1.z.date()).optional(),
    advanceDirectivesNotes: zod_1.z.string().max(2000).optional(),
    // DNR/DNI Status
    dnrStatus: zod_1.z.boolean().default(false),
    dnrDate: zod_1.z.string().datetime().or(zod_1.z.date()).optional(),
    dniStatus: zod_1.z.boolean().default(false),
    dniDate: zod_1.z.string().datetime().or(zod_1.z.date()).optional(),
    codeStatus: zod_1.z.enum(['FULL_CODE', 'DNR', 'DNI', 'DNR_DNI', 'COMFORT_CARE_ONLY', 'AND']).optional(),
    // Primary Caregiver
    primaryCaregiverId: zod_1.z.string().cuid('Invalid caregiver ID').optional(),
    // Quality of Life
    qualityOfLifeScore: zod_1.z.number().int().min(0).max(10).optional(),
    lastQoLAssessment: zod_1.z.string().datetime().or(zod_1.z.date()).optional(),
    // Spiritual Care
    religiousAffiliation: zod_1.z.string().max(100).optional(),
    spiritualCareNeeds: zod_1.z.string().max(1000).optional(),
    chaplainAssigned: zod_1.z.boolean().default(false),
    // Family Contacts (Hierarchical)
    primaryContactName: zod_1.z.string().max(100).optional(),
    primaryContactRelation: zod_1.z.string().max(50).optional(),
    primaryContactPhone: exports.phoneValidator,
    primaryContactEmail: exports.emailValidator,
    primaryContactAddress: zod_1.z.string().max(exports.FIELD_LIMITS.address.max).optional(),
    secondaryContactName: zod_1.z.string().max(100).optional(),
    secondaryContactRelation: zod_1.z.string().max(50).optional(),
    secondaryContactPhone: exports.phoneValidator,
    secondaryContactEmail: exports.emailValidator,
    emergencyContactName: zod_1.z.string().max(100).optional(),
    emergencyContactPhone: exports.phoneValidator,
    emergencyContactRelation: zod_1.z.string().max(50).optional(),
    // Family Portal
    familyPortalEnabled: zod_1.z.boolean().default(false),
    // Humanization & Dignity
    photoUrl: zod_1.z.string().url().optional(),
    photoConsentDate: zod_1.z.string().datetime().or(zod_1.z.date()).optional(),
    photoConsentBy: zod_1.z.string().max(100).optional(),
    preferredName: zod_1.z.string().max(100).optional(),
    pronouns: zod_1.z.string().max(50).optional(),
    culturalPreferences: zod_1.z.string().max(1000).optional(),
    // Special Needs Support
    hasSpecialNeeds: zod_1.z.boolean().default(false),
    specialNeedsType: zod_1.z.array(zod_1.z.string().max(50)).max(10).optional(),
    communicationNeeds: zod_1.z.string().max(1000).optional(),
    mobilityNeeds: zod_1.z.string().max(1000).optional(),
    dietaryNeeds: zod_1.z.string().max(1000).optional(),
    sensoryNeeds: zod_1.z.string().max(1000).optional(),
    // Care Team Notes
    careTeamNotes: zod_1.z.string().max(2000).optional(),
    flaggedConcerns: zod_1.z.array(zod_1.z.string().max(100)).max(20).optional(),
    // Assignment
    assignedClinicianId: zod_1.z.string().cuid('Invalid clinician ID').optional(),
    createdBy: zod_1.z.string().cuid('Invalid user ID').optional(),
});
exports.UpdatePatientSchema = exports.CreatePatientSchema.partial();
exports.PatientQuerySchema = zod_1.z.object({
    page: zod_1.z.string().optional().default('1').transform(Number).pipe(zod_1.z.number().int().min(1)),
    limit: zod_1.z.string().optional().default('50').transform(Number).pipe(zod_1.z.number().int().min(1).max(100)),
    search: zod_1.z.string().max(100).optional(),
    isActive: zod_1.z.string().optional().transform((v) => v === 'true'),
    assignedClinicianId: zod_1.z.string().cuid().optional(),
});
// ============================================================================
// SOAP NOTE VALIDATION
// ============================================================================
exports.DiagnosisSchema = zod_1.z.object({
    icd10Code: exports.icd10CodeValidator,
    description: zod_1.z.string().min(1).max(200, 'Diagnosis description must be less than 200 characters'),
    isPrimary: zod_1.z.boolean().default(false),
});
exports.ProcedureSchema = zod_1.z.object({
    cptCode: exports.cptCodeValidator,
    description: zod_1.z.string().min(1).max(200, 'Procedure description must be less than 200 characters'),
});
exports.MedicationSchema = zod_1.z.object({
    action: zod_1.z.enum(['prescribe', 'discontinue', 'modify'], {
        errorMap: () => ({ message: 'Action must be prescribe, discontinue, or modify' })
    }),
    name: zod_1.z.string().min(1).max(exports.FIELD_LIMITS.medicationName.max, 'Medication name must be less than 200 characters'),
    dose: zod_1.z.string().min(1).max(exports.FIELD_LIMITS.dosage.max, 'Dosage must be less than 50 characters')
        .regex(/\d+\s*(mg|mL|g|mcg|IU|units?)/i, 'Dosage must include unit (mg, mL, g, mcg, IU, units)'),
    frequency: zod_1.z.string().min(1).max(100, 'Frequency must be less than 100 characters'),
    duration: zod_1.z.string().max(50).optional(),
    instructions: zod_1.z.string().max(exports.FIELD_LIMITS.instructions.max).optional(),
});
exports.CreateSOAPNoteSchema = zod_1.z.object({
    // Session reference
    sessionId: zod_1.z.string().cuid('Invalid session ID').optional(),
    // Patient and clinician
    patientId: zod_1.z.string().cuid('Invalid patient ID'),
    clinicianId: zod_1.z.string().cuid('Invalid clinician ID'),
    // Chief Complaint
    chiefComplaint: zod_1.z.string()
        .min(1, 'Chief complaint is required')
        .max(exports.FIELD_LIMITS.chiefComplaint.max, 'Chief complaint must be less than 500 characters'),
    // SOAP Sections
    subjective: zod_1.z.string()
        .max(exports.FIELD_LIMITS.soapSection.max, 'Subjective section must be less than 10,000 characters')
        .optional()
        .default(''),
    objective: zod_1.z.string()
        .max(exports.FIELD_LIMITS.soapSection.max, 'Objective section must be less than 10,000 characters')
        .optional()
        .default(''),
    assessment: zod_1.z.string()
        .max(exports.FIELD_LIMITS.soapSection.max, 'Assessment section must be less than 10,000 characters')
        .optional()
        .default(''),
    plan: zod_1.z.string()
        .max(exports.FIELD_LIMITS.soapSection.max, 'Plan section must be less than 10,000 characters')
        .optional()
        .default(''),
    // Confidence scores (AI-generated)
    subjectiveConfidence: zod_1.z.number().min(0).max(1).optional(),
    objectiveConfidence: zod_1.z.number().min(0).max(1).optional(),
    assessmentConfidence: zod_1.z.number().min(0).max(1).optional(),
    planConfidence: zod_1.z.number().min(0).max(1).optional(),
    overallConfidence: zod_1.z.number().min(0).max(1).optional(),
    // Vital Signs
    vitalSigns: exports.VitalSignsSchema,
    // Diagnoses (structured)
    diagnoses: zod_1.z.array(exports.DiagnosisSchema).max(20, 'Maximum 20 diagnoses allowed').optional().default([]),
    // Procedures
    procedures: zod_1.z.array(exports.ProcedureSchema).max(20, 'Maximum 20 procedures allowed').optional().default([]),
    // Medications
    medications: zod_1.z.array(exports.MedicationSchema).max(30, 'Maximum 30 medications allowed').optional().default([]),
    // AI metadata
    model: zod_1.z.string().optional(),
    tokensUsed: zod_1.z.number().int().optional(),
    processingTime: zod_1.z.number().int().optional(),
});
exports.UpdateSOAPNoteSchema = exports.CreateSOAPNoteSchema.partial().omit({
    sessionId: true,
    patientId: true,
    clinicianId: true,
});
// ============================================================================
// AUDIO UPLOAD VALIDATION
// ============================================================================
exports.AudioUploadSchema = zod_1.z.object({
    duration: zod_1.z.number()
        .int('Duration must be a whole number')
        .min(exports.FIELD_LIMITS.audioDuration.min, `Recording must be at least ${exports.FIELD_LIMITS.audioDuration.min} seconds`)
        .max(exports.FIELD_LIMITS.audioDuration.max, `Recording must be less than ${exports.FIELD_LIMITS.audioDuration.max} seconds`)
        .or(zod_1.z.string().transform(Number).pipe(zod_1.z.number().int().min(exports.FIELD_LIMITS.audioDuration.min).max(exports.FIELD_LIMITS.audioDuration.max))),
    // File validation happens in file-verification.ts (magic bytes)
    // This just validates the metadata
});
// ============================================================================
// SCRIBE SESSION VALIDATION
// ============================================================================
exports.CreateScribeSessionSchema = zod_1.z.object({
    patientId: zod_1.z.string().cuid('Invalid patient ID'),
    clinicianId: zod_1.z.string().cuid('Invalid clinician ID').optional(), // Optional - will use context.user.id
});
// ============================================================================
// PRESCRIPTION VALIDATION
// ============================================================================
exports.CreatePrescriptionSchema = zod_1.z.object({
    patientId: zod_1.z.string().cuid('Invalid patient ID'),
    medications: zod_1.z.array(exports.MedicationSchema).min(1, 'At least one medication required'),
    diagnosis: zod_1.z.string().max(500).optional(),
    instructions: zod_1.z.string().max(exports.FIELD_LIMITS.instructions.max).optional(),
});
//# sourceMappingURL=schemas.js.map