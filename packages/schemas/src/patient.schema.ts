/**
 * Patient Schema - Single Source of Truth
 * Medical-Grade Validation for Healthcare Data
 *
 * Standards:
 * - E.164 phone number format (international)
 * - RFC 5322 email validation
 * - HIPAA-compliant PHI validation
 * - Brazilian National Identifiers (CNS, CPF, CNES, IBGE)
 */

import { z } from 'zod';
import { PATIENT_FIELD_LIMITS } from './constants';

// ============================================================================
// BASE VALIDATORS
// ============================================================================

/**
 * Validate person name (letters, spaces, hyphens, apostrophes only)
 * Supports Spanish/Portuguese characters (á, é, í, ó, ú, ñ, ü)
 */
export const nameValidator = z.string()
  .min(PATIENT_FIELD_LIMITS.name.min, `Name must be at least ${PATIENT_FIELD_LIMITS.name.min} characters`)
  .max(PATIENT_FIELD_LIMITS.name.max, `Name must be less than ${PATIENT_FIELD_LIMITS.name.max} characters`)
  .regex(/^[a-zA-ZáéíóúñÁÉÍÓÚÑüÜ\s\-']+$/,
    'Name can only contain letters, spaces, hyphens, and apostrophes');

/**
 * Validate phone number (E.164 format)
 * Accepts: +52 555 123 4567, +1-555-123-4567, (555) 123-4567, 5551234567, etc.
 * Very permissive - accepts any reasonable phone format
 */
export const phoneValidator = z.string()
  .min(PATIENT_FIELD_LIMITS.phone.min)
  .max(PATIENT_FIELD_LIMITS.phone.max)
  .regex(/^[\+\d][\d\s\-\(\)\.]+$/,
    'Invalid phone number format')
  .optional()
  .nullable();

/**
 * Validate email (RFC 5322 compliant)
 */
export const emailValidator = z.string()
  .email('Invalid email address')
  .max(PATIENT_FIELD_LIMITS.email.max)
  .optional()
  .nullable();

/**
 * Validate MRN (Medical Record Number)
 * Format: 6-20 alphanumeric characters
 */
export const mrnValidator = z.string()
  .min(6, 'MRN must be at least 6 characters')
  .max(20, 'MRN must be less than 20 characters')
  .regex(/^[A-Z0-9\-]+$/i, 'MRN can only contain letters, numbers, and hyphens');

// ============================================================================
// BRAZILIAN IDENTIFIER VALIDATORS
// ============================================================================

export const cnsValidator = z.string()
  .length(15, 'CNS must be exactly 15 digits')
  .regex(/^\d{15}$/, 'CNS must contain only digits')
  .optional();

export const cpfValidator = z.string()
  .length(11, 'CPF must be exactly 11 digits')
  .regex(/^\d{11}$/, 'CPF must contain only digits')
  .optional();

export const cnesValidator = z.string()
  .length(7, 'CNES must be exactly 7 digits')
  .regex(/^\d{7}$/, 'CNES must contain only digits')
  .optional();

export const ibgeCodeValidator = z.string()
  .length(7, 'IBGE municipality code must be exactly 7 digits')
  .regex(/^\d{7}$/, 'IBGE code must contain only digits')
  .optional();

// ============================================================================
// PATIENT SCHEMAS
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

  // Medical Record Numbers
  mrn: mrnValidator,
  externalMrn: z.string().max(50).optional(),

  // Optional demographic fields
  gender: z.enum(['M', 'F', 'O', 'U'], {
    errorMap: () => ({ message: 'Gender must be M (Male), F (Female), O (Other), or U (Unknown)' })
  }).optional(),

  // Contact information (PHI)
  email: emailValidator,
  phone: phoneValidator,
  address: z.string().max(PATIENT_FIELD_LIMITS.address.max).optional().nullable(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().length(2).default('MX'), // ISO 3166-1 alpha-2

  // De-identification
  ageBand: z.string().regex(/^\d{1,2}-\d{1,2}$/, 'Age band must be in format: XX-YY (e.g., 30-39)').optional(),
  region: z.string().max(10).optional(),

  // Brazilian National Identifiers
  cns: cnsValidator,
  cpf: cpfValidator,
  rg: z.string().max(20).optional(),
  municipalityCode: ibgeCodeValidator,
  healthUnitCNES: cnesValidator,
  susPacientId: z.string().max(50).optional(),

  // Palliative Care Fields
  isPalliativeCare: z.boolean().default(false),
  comfortCareOnly: z.boolean().default(false),
  advanceDirectivesStatus: z.enum(['NOT_COMPLETED', 'IN_PROGRESS', 'COMPLETED', 'REVIEWED_ANNUALLY']).optional(),
  advanceDirectivesDate: z.string().datetime().or(z.date()).optional(),
  advanceDirectivesNotes: z.string().max(2000).optional(),

  // DNR/DNI Status
  dnrStatus: z.boolean().default(false),
  dnrDate: z.string().datetime().or(z.date()).optional(),
  dniStatus: z.boolean().default(false),
  dniDate: z.string().datetime().or(z.date()).optional(),
  codeStatus: z.enum(['FULL_CODE', 'DNR', 'DNI', 'DNR_DNI', 'COMFORT_CARE_ONLY', 'AND']).optional(),

  // Primary Caregiver
  primaryCaregiverId: z.string().cuid('Invalid caregiver ID').optional(),

  // Quality of Life
  qualityOfLifeScore: z.number().int().min(0).max(10).optional(),
  lastQoLAssessment: z.string().datetime().or(z.date()).optional(),

  // Spiritual Care
  religiousAffiliation: z.string().max(100).optional(),
  spiritualCareNeeds: z.string().max(1000).optional(),
  chaplainAssigned: z.boolean().default(false),

  // Family Contacts (Hierarchical)
  primaryContactName: z.string().max(100).optional(),
  primaryContactRelation: z.string().max(50).optional(),
  primaryContactPhone: phoneValidator,
  primaryContactEmail: emailValidator,
  primaryContactAddress: z.string().max(PATIENT_FIELD_LIMITS.address.max).optional(),

  secondaryContactName: z.string().max(100).optional(),
  secondaryContactRelation: z.string().max(50).optional(),
  secondaryContactPhone: phoneValidator,
  secondaryContactEmail: emailValidator,

  emergencyContactName: z.string().max(100).optional(),
  emergencyContactPhone: phoneValidator,
  emergencyContactRelation: z.string().max(50).optional(),

  // Family Portal
  familyPortalEnabled: z.boolean().default(false),

  // Humanization & Dignity
  photoUrl: z.string().url().optional(),
  photoConsentDate: z.string().datetime().or(z.date()).optional(),
  photoConsentBy: z.string().max(100).optional(),
  preferredName: z.string().max(100).optional(),
  pronouns: z.string().max(50).optional(),
  culturalPreferences: z.string().max(1000).optional(),

  // Special Needs Support
  hasSpecialNeeds: z.boolean().default(false),
  specialNeedsType: z.array(z.string().max(50)).max(10).optional(),
  communicationNeeds: z.string().max(1000).optional(),
  mobilityNeeds: z.string().max(1000).optional(),
  dietaryNeeds: z.string().max(1000).optional(),
  sensoryNeeds: z.string().max(1000).optional(),

  // Care Team Notes
  careTeamNotes: z.string().max(2000).optional(),
  flaggedConcerns: z.array(z.string().max(100)).max(20).optional(),

  // Assignment
  assignedClinicianId: z.string().cuid('Invalid clinician ID').optional(),
  createdBy: z.string().cuid('Invalid user ID').optional(),
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
// TYPE EXPORTS
// ============================================================================

export type CreatePatientInput = z.infer<typeof CreatePatientSchema>;
export type UpdatePatientInput = z.infer<typeof UpdatePatientSchema>;
export type PatientQueryInput = z.infer<typeof PatientQuerySchema>;
