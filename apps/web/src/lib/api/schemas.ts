/**
 * API Request/Response Validation Schemas
 * Using Zod for type-safe validation
 */

import { z } from 'zod';

// ============================================================================
// PATIENT SCHEMAS
// ============================================================================

export const CreatePatientSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().datetime().or(z.date()),
  gender: z.enum(['M', 'F', 'O', 'U']).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default('MX'),
  ageBand: z.string().optional(),
  region: z.string().optional(),
  assignedClinicianId: z.string().optional(),
});

export const UpdatePatientSchema = CreatePatientSchema.partial();

export const PatientQuerySchema = z.object({
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('50').transform(Number),
  search: z.string().optional(),
  isActive: z.string().optional().transform((v) => v === 'true'),
  assignedClinicianId: z.string().optional(),
});

// ============================================================================
// PRESCRIPTION SCHEMAS
// ============================================================================

export const MedicationItemSchema = z.object({
  name: z.string().min(1, 'Medication name is required'),
  dose: z.string().min(1, 'Dose is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  instructions: z.string().optional(),
});

export const CreatePrescriptionSchema = z.object({
  patientId: z.string().cuid('Invalid patient ID'),
  clinicianId: z.string().cuid('Invalid clinician ID'),
  medications: z.array(MedicationItemSchema).min(1, 'At least one medication required'),
  instructions: z.string().optional(),
  diagnosis: z.string().optional(),
  signatureMethod: z.enum(['pin', 'signature']),
  signatureData: z.string().min(4, 'Signature data required'),
});

export const PrescriptionQuerySchema = z.object({
  patientId: z.string().cuid().optional(),
  clinicianId: z.string().cuid().optional(),
  status: z.enum(['PENDING', 'SIGNED', 'SENT', 'DISPENSED', 'CANCELLED']).optional(),
  limit: z.string().optional().default('50').transform(Number),
});

// ============================================================================
// CLINICAL NOTES SCHEMAS
// ============================================================================

export const CreateClinicalNoteSchema = z.object({
  patientId: z.string().cuid('Invalid patient ID'),
  clinicianId: z.string().cuid('Invalid clinician ID'),
  noteType: z.enum(['FOLLOW_UP', 'INITIAL_CONSULT', 'PROCEDURE', 'EMERGENCY']),
  chiefComplaint: z.string().min(1, 'Chief complaint is required'),
  subjective: z.string().optional().default(''),
  objective: z.string().optional().default(''),
  assessment: z.string().optional().default(''),
  plan: z.string().optional().default(''),
  vitalSigns: z.object({
    bloodPressure: z.string().optional(),
    heartRate: z.string().optional(),
    temperature: z.string().optional(),
    respiratoryRate: z.string().optional(),
    oxygenSaturation: z.string().optional(),
    weight: z.string().optional(),
  }).optional(),
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
// APPOINTMENT SCHEMAS
// ============================================================================

export const CreateAppointmentSchema = z.object({
  patientId: z.string().cuid('Invalid patient ID'),
  clinicianId: z.string().cuid('Invalid clinician ID'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  startTime: z.string().datetime().or(z.date()),
  endTime: z.string().datetime().or(z.date()),
  timezone: z.string().default('America/Mexico_City'),
  type: z.enum(['IN_PERSON', 'TELEMEDICINE', 'PHONE', 'HOME_VISIT']).default('IN_PERSON'),
  meetingUrl: z.string().url().optional(),
});

export const UpdateAppointmentSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  startTime: z.string().datetime().or(z.date()).optional(),
  endTime: z.string().datetime().or(z.date()).optional(),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']).optional(),
  meetingUrl: z.string().url().optional(),
});

export const AppointmentQuerySchema = z.object({
  patientId: z.string().cuid().optional(),
  clinicianId: z.string().cuid().optional(),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.string().optional().default('50').transform(Number),
});

// ============================================================================
// CONSENT SCHEMAS
// ============================================================================

export const CreateConsentSchema = z.object({
  patientId: z.string().cuid('Invalid patient ID'),
  type: z.enum(['TREATMENT', 'DATA_SHARING', 'RESEARCH', 'TELEMEDICINE', 'PHOTOGRAPHY']),
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  version: z.string().default('1.0'),
  signatureData: z.string().min(1, 'Signature required'),
  witnessName: z.string().optional(),
  witnessSignature: z.string().optional(),
});

export const ConsentQuerySchema = z.object({
  patientId: z.string().cuid().optional(),
  type: z.enum(['TREATMENT', 'DATA_SHARING', 'RESEARCH', 'TELEMEDICINE', 'PHOTOGRAPHY']).optional(),
  isActive: z.string().optional().transform((v) => v === 'true'),
  limit: z.string().optional().default('50').transform(Number),
});

// ============================================================================
// DOCUMENT SCHEMAS
// ============================================================================

export const DocumentUploadSchema = z.object({
  patientId: z.string().cuid('Invalid patient ID'),
  fileName: z.string().min(1, 'File name is required'),
  fileType: z.string().min(1, 'File type is required'),
  fileSize: z.number().positive('File size must be positive'),
  documentType: z.enum([
    'LAB_RESULTS',
    'IMAGING',
    'CONSULTATION_NOTES',
    'DISCHARGE_SUMMARY',
    'PRESCRIPTION',
    'INSURANCE',
    'CONSENT_FORM',
    'OTHER',
  ]),
  storageUrl: z.string().url('Invalid storage URL'),
  uploadedBy: z.string().cuid('Invalid uploader ID'),
});

export const DocumentQuerySchema = z.object({
  patientId: z.string().cuid().optional(),
  documentType: z.enum([
    'LAB_RESULTS',
    'IMAGING',
    'CONSULTATION_NOTES',
    'DISCHARGE_SUMMARY',
    'PRESCRIPTION',
    'INSURANCE',
    'CONSENT_FORM',
    'OTHER',
  ]).optional(),
  isDeidentified: z.string().optional().transform((v) => v === 'true'),
  limit: z.string().optional().default('50').transform(Number),
});

// ============================================================================
// USER SCHEMAS
// ============================================================================

export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF']).default('CLINICIAN'),
  specialty: z.string().optional(),
  licenseNumber: z.string().optional(),
});

export const UpdateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  specialty: z.string().optional(),
  licenseNumber: z.string().optional(),
  mfaEnabled: z.boolean().optional(),
});

export const UserQuerySchema = z.object({
  role: z.enum(['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF']).optional(),
  search: z.string().optional(),
  limit: z.string().optional().default('50').transform(Number),
});

// ============================================================================
// MEDICATION SCHEMAS
// ============================================================================

export const CreateMedicationSchema = z.object({
  patientId: z.string().cuid('Invalid patient ID'),
  name: z.string().min(1, 'Medication name is required'),
  genericName: z.string().optional(),
  dose: z.string().min(1, 'Dose is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  route: z.string().optional(),
  instructions: z.string().optional(),
  startDate: z.string().datetime().or(z.date()).optional(),
  endDate: z.string().datetime().or(z.date()).optional(),
  prescribedBy: z.string().optional(),
  prescriptionHash: z.string().optional(),
});

export const UpdateMedicationSchema = CreateMedicationSchema.partial().omit({ patientId: true });

export const MedicationQuerySchema = z.object({
  patientId: z.string().cuid().optional(),
  isActive: z.string().optional().transform((v) => v === 'true'),
  limit: z.string().optional().default('50').transform(Number),
});

// ============================================================================
// AUDIT LOG SCHEMAS
// ============================================================================

export const CreateAuditLogSchema = z.object({
  userEmail: z.string().email().optional().default('system'),
  action: z.enum([
    'CREATE',
    'READ',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'LOGOUT',
    'EXPORT',
    'SHARE',
    'CONSENT_GIVEN',
    'CONSENT_REVOKED',
  ]),
  resource: z.string().min(1, 'Resource is required'),
  resourceId: z.string().default('N/A'),
  details: z.record(z.any()).optional(),
  success: z.boolean().default(true),
});

export const AuditLogQuerySchema = z.object({
  userId: z.string().cuid().optional(),
  userEmail: z.string().email().optional(),
  action: z.enum([
    'CREATE',
    'READ',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'LOGOUT',
    'EXPORT',
    'SHARE',
    'CONSENT_GIVEN',
    'CONSENT_REVOKED',
  ]).optional(),
  resource: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.string().optional().default('100').transform(Number),
});

// ============================================================================
// ANALYTICS SCHEMAS
// ============================================================================

export const AnalyticsQuerySchema = z.object({
  metric: z.enum([
    'patient_count',
    'appointments_today',
    'prescriptions_today',
    'clinical_notes_count',
    'active_medications',
    'consent_compliance',
  ]),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  clinicianId: z.string().cuid().optional(),
});

// ============================================================================
// SEARCH SCHEMAS
// ============================================================================

export const SearchQuerySchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  type: z.enum(['patients', 'prescriptions', 'clinical_notes', 'appointments', 'all']).optional().default('all'),
  limit: z.string().optional().default('20').transform(Number),
  offset: z.string().optional().default('0').transform(Number),
});

// ============================================================================
// TYPE EXPORTS (Inferred from schemas)
// ============================================================================

export type CreatePatient = z.infer<typeof CreatePatientSchema>;
export type UpdatePatient = z.infer<typeof UpdatePatientSchema>;
export type PatientQuery = z.infer<typeof PatientQuerySchema>;

export type CreatePrescription = z.infer<typeof CreatePrescriptionSchema>;
export type PrescriptionQuery = z.infer<typeof PrescriptionQuerySchema>;

export type CreateClinicalNote = z.infer<typeof CreateClinicalNoteSchema>;
export type ClinicalNoteQuery = z.infer<typeof ClinicalNoteQuerySchema>;

export type CreateAppointment = z.infer<typeof CreateAppointmentSchema>;
export type UpdateAppointment = z.infer<typeof UpdateAppointmentSchema>;
export type AppointmentQuery = z.infer<typeof AppointmentQuerySchema>;

export type CreateConsent = z.infer<typeof CreateConsentSchema>;
export type ConsentQuery = z.infer<typeof ConsentQuerySchema>;

export type DocumentUpload = z.infer<typeof DocumentUploadSchema>;
export type DocumentQuery = z.infer<typeof DocumentQuerySchema>;

export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
export type UserQuery = z.infer<typeof UserQuerySchema>;

export type CreateMedication = z.infer<typeof CreateMedicationSchema>;
export type UpdateMedication = z.infer<typeof UpdateMedicationSchema>;
export type MedicationQuery = z.infer<typeof MedicationQuerySchema>;

export type CreateAuditLog = z.infer<typeof CreateAuditLogSchema>;
export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;

export type AnalyticsQuery = z.infer<typeof AnalyticsQuerySchema>;
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
