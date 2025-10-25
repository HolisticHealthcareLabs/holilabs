"use strict";
/**
 * API Request/Response Validation Schemas
 * Using Zod for type-safe validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchQuerySchema = exports.AnalyticsQuerySchema = exports.AuditLogQuerySchema = exports.CreateAuditLogSchema = exports.MedicationQuerySchema = exports.UpdateMedicationSchema = exports.CreateMedicationSchema = exports.UserQuerySchema = exports.UpdateUserSchema = exports.CreateUserSchema = exports.DocumentQuerySchema = exports.DocumentUploadSchema = exports.ConsentQuerySchema = exports.CreateConsentSchema = exports.AppointmentQuerySchema = exports.UpdateAppointmentSchema = exports.CreateAppointmentSchema = exports.ClinicalNoteQuerySchema = exports.CreateClinicalNoteSchema = exports.PrescriptionQuerySchema = exports.CreatePrescriptionSchema = exports.MedicationItemSchema = exports.PatientQuerySchema = exports.UpdatePatientSchema = exports.CreatePatientSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// PATIENT SCHEMAS
// ============================================================================
exports.CreatePatientSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1, 'First name is required'),
    lastName: zod_1.z.string().min(1, 'Last name is required'),
    dateOfBirth: zod_1.z.string().datetime().or(zod_1.z.date()),
    gender: zod_1.z.enum(['M', 'F', 'O', 'U']).optional(),
    email: zod_1.z.string().email().optional().nullable(),
    phone: zod_1.z.string().optional().nullable(),
    address: zod_1.z.string().optional().nullable(),
    city: zod_1.z.string().optional(),
    state: zod_1.z.string().optional(),
    postalCode: zod_1.z.string().optional(),
    country: zod_1.z.string().default('MX'),
    ageBand: zod_1.z.string().optional(),
    region: zod_1.z.string().optional(),
    assignedClinicianId: zod_1.z.string().optional(),
});
exports.UpdatePatientSchema = exports.CreatePatientSchema.partial();
exports.PatientQuerySchema = zod_1.z.object({
    page: zod_1.z.string().optional().default('1').transform(Number),
    limit: zod_1.z.string().optional().default('50').transform(Number),
    search: zod_1.z.string().optional(),
    isActive: zod_1.z.string().optional().transform((v) => v === 'true'),
    assignedClinicianId: zod_1.z.string().optional(),
});
// ============================================================================
// PRESCRIPTION SCHEMAS
// ============================================================================
exports.MedicationItemSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Medication name is required'),
    dose: zod_1.z.string().min(1, 'Dose is required'),
    frequency: zod_1.z.string().min(1, 'Frequency is required'),
    instructions: zod_1.z.string().optional(),
});
exports.CreatePrescriptionSchema = zod_1.z.object({
    patientId: zod_1.z.string().cuid('Invalid patient ID'),
    clinicianId: zod_1.z.string().cuid('Invalid clinician ID'),
    medications: zod_1.z.array(exports.MedicationItemSchema).min(1, 'At least one medication required'),
    instructions: zod_1.z.string().optional(),
    diagnosis: zod_1.z.string().optional(),
    signatureMethod: zod_1.z.enum(['pin', 'signature']),
    signatureData: zod_1.z.string().min(4, 'Signature data required'),
});
exports.PrescriptionQuerySchema = zod_1.z.object({
    patientId: zod_1.z.string().cuid().optional(),
    clinicianId: zod_1.z.string().cuid().optional(),
    status: zod_1.z.enum(['PENDING', 'SIGNED', 'SENT', 'DISPENSED', 'CANCELLED']).optional(),
    limit: zod_1.z.string().optional().default('50').transform(Number),
});
// ============================================================================
// CLINICAL NOTES SCHEMAS
// ============================================================================
exports.CreateClinicalNoteSchema = zod_1.z.object({
    patientId: zod_1.z.string().cuid('Invalid patient ID'),
    clinicianId: zod_1.z.string().cuid('Invalid clinician ID'),
    noteType: zod_1.z.enum(['FOLLOW_UP', 'INITIAL_CONSULT', 'PROCEDURE', 'EMERGENCY']),
    chiefComplaint: zod_1.z.string().min(1, 'Chief complaint is required'),
    subjective: zod_1.z.string().optional().default(''),
    objective: zod_1.z.string().optional().default(''),
    assessment: zod_1.z.string().optional().default(''),
    plan: zod_1.z.string().optional().default(''),
    vitalSigns: zod_1.z.object({
        bloodPressure: zod_1.z.string().optional(),
        heartRate: zod_1.z.string().optional(),
        temperature: zod_1.z.string().optional(),
        respiratoryRate: zod_1.z.string().optional(),
        oxygenSaturation: zod_1.z.string().optional(),
        weight: zod_1.z.string().optional(),
    }).optional(),
    diagnoses: zod_1.z.array(zod_1.z.string()).optional().default([]),
    procedures: zod_1.z.array(zod_1.z.string()).optional().default([]),
});
exports.ClinicalNoteQuerySchema = zod_1.z.object({
    patientId: zod_1.z.string().cuid().optional(),
    clinicianId: zod_1.z.string().cuid().optional(),
    noteType: zod_1.z.enum(['FOLLOW_UP', 'INITIAL_CONSULT', 'PROCEDURE', 'EMERGENCY']).optional(),
    limit: zod_1.z.string().optional().default('50').transform(Number),
});
// ============================================================================
// APPOINTMENT SCHEMAS
// ============================================================================
exports.CreateAppointmentSchema = zod_1.z.object({
    patientId: zod_1.z.string().cuid('Invalid patient ID'),
    clinicianId: zod_1.z.string().cuid('Invalid clinician ID'),
    title: zod_1.z.string().min(1, 'Title is required'),
    description: zod_1.z.string().optional(),
    startTime: zod_1.z.string().datetime().or(zod_1.z.date()),
    endTime: zod_1.z.string().datetime().or(zod_1.z.date()),
    timezone: zod_1.z.string().default('America/Mexico_City'),
    type: zod_1.z.enum(['IN_PERSON', 'TELEMEDICINE', 'PHONE', 'HOME_VISIT']).default('IN_PERSON'),
    meetingUrl: zod_1.z.string().url().optional(),
});
exports.UpdateAppointmentSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).optional(),
    description: zod_1.z.string().optional(),
    startTime: zod_1.z.string().datetime().or(zod_1.z.date()).optional(),
    endTime: zod_1.z.string().datetime().or(zod_1.z.date()).optional(),
    status: zod_1.z.enum(['SCHEDULED', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']).optional(),
    meetingUrl: zod_1.z.string().url().optional(),
});
exports.AppointmentQuerySchema = zod_1.z.object({
    patientId: zod_1.z.string().cuid().optional(),
    clinicianId: zod_1.z.string().cuid().optional(),
    status: zod_1.z.enum(['SCHEDULED', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']).optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    limit: zod_1.z.string().optional().default('50').transform(Number),
});
// ============================================================================
// CONSENT SCHEMAS
// ============================================================================
exports.CreateConsentSchema = zod_1.z.object({
    patientId: zod_1.z.string().cuid('Invalid patient ID'),
    type: zod_1.z.enum(['TREATMENT', 'DATA_SHARING', 'RESEARCH', 'TELEMEDICINE', 'PHOTOGRAPHY']),
    title: zod_1.z.string().min(1, 'Title is required'),
    content: zod_1.z.string().min(1, 'Content is required'),
    version: zod_1.z.string().default('1.0'),
    signatureData: zod_1.z.string().min(1, 'Signature required'),
    witnessName: zod_1.z.string().optional(),
    witnessSignature: zod_1.z.string().optional(),
});
exports.ConsentQuerySchema = zod_1.z.object({
    patientId: zod_1.z.string().cuid().optional(),
    type: zod_1.z.enum(['TREATMENT', 'DATA_SHARING', 'RESEARCH', 'TELEMEDICINE', 'PHOTOGRAPHY']).optional(),
    isActive: zod_1.z.string().optional().transform((v) => v === 'true'),
    limit: zod_1.z.string().optional().default('50').transform(Number),
});
// ============================================================================
// DOCUMENT SCHEMAS
// ============================================================================
exports.DocumentUploadSchema = zod_1.z.object({
    patientId: zod_1.z.string().cuid('Invalid patient ID'),
    fileName: zod_1.z.string().min(1, 'File name is required'),
    fileType: zod_1.z.string().min(1, 'File type is required'),
    fileSize: zod_1.z.number().positive('File size must be positive'),
    documentType: zod_1.z.enum([
        'LAB_RESULTS',
        'IMAGING',
        'CONSULTATION_NOTES',
        'DISCHARGE_SUMMARY',
        'PRESCRIPTION',
        'INSURANCE',
        'CONSENT_FORM',
        'OTHER',
    ]),
    storageUrl: zod_1.z.string().url('Invalid storage URL'),
    uploadedBy: zod_1.z.string().cuid('Invalid uploader ID'),
});
exports.DocumentQuerySchema = zod_1.z.object({
    patientId: zod_1.z.string().cuid().optional(),
    documentType: zod_1.z.enum([
        'LAB_RESULTS',
        'IMAGING',
        'CONSULTATION_NOTES',
        'DISCHARGE_SUMMARY',
        'PRESCRIPTION',
        'INSURANCE',
        'CONSENT_FORM',
        'OTHER',
    ]).optional(),
    isDeidentified: zod_1.z.string().optional().transform((v) => v === 'true'),
    limit: zod_1.z.string().optional().default('50').transform(Number),
});
// ============================================================================
// USER SCHEMAS
// ============================================================================
exports.CreateUserSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    firstName: zod_1.z.string().min(1, 'First name is required'),
    lastName: zod_1.z.string().min(1, 'Last name is required'),
    role: zod_1.z.enum(['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF']).default('CLINICIAN'),
    specialty: zod_1.z.string().optional(),
    licenseNumber: zod_1.z.string().optional(),
});
exports.UpdateUserSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1).optional(),
    lastName: zod_1.z.string().min(1).optional(),
    specialty: zod_1.z.string().optional(),
    licenseNumber: zod_1.z.string().optional(),
    mfaEnabled: zod_1.z.boolean().optional(),
});
exports.UserQuerySchema = zod_1.z.object({
    role: zod_1.z.enum(['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF']).optional(),
    search: zod_1.z.string().optional(),
    limit: zod_1.z.string().optional().default('50').transform(Number),
});
// ============================================================================
// MEDICATION SCHEMAS
// ============================================================================
exports.CreateMedicationSchema = zod_1.z.object({
    patientId: zod_1.z.string().cuid('Invalid patient ID'),
    name: zod_1.z.string().min(1, 'Medication name is required'),
    genericName: zod_1.z.string().optional(),
    dose: zod_1.z.string().min(1, 'Dose is required'),
    frequency: zod_1.z.string().min(1, 'Frequency is required'),
    route: zod_1.z.string().optional(),
    instructions: zod_1.z.string().optional(),
    startDate: zod_1.z.string().datetime().or(zod_1.z.date()).optional(),
    endDate: zod_1.z.string().datetime().or(zod_1.z.date()).optional(),
    prescribedBy: zod_1.z.string().optional(),
    prescriptionHash: zod_1.z.string().optional(),
});
exports.UpdateMedicationSchema = exports.CreateMedicationSchema.partial().omit({ patientId: true });
exports.MedicationQuerySchema = zod_1.z.object({
    patientId: zod_1.z.string().cuid().optional(),
    isActive: zod_1.z.string().optional().transform((v) => v === 'true'),
    limit: zod_1.z.string().optional().default('50').transform(Number),
});
// ============================================================================
// AUDIT LOG SCHEMAS
// ============================================================================
exports.CreateAuditLogSchema = zod_1.z.object({
    userEmail: zod_1.z.string().email().optional().default('system'),
    action: zod_1.z.enum([
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
    resource: zod_1.z.string().min(1, 'Resource is required'),
    resourceId: zod_1.z.string().default('N/A'),
    details: zod_1.z.record(zod_1.z.any()).optional(),
    success: zod_1.z.boolean().default(true),
});
exports.AuditLogQuerySchema = zod_1.z.object({
    userId: zod_1.z.string().cuid().optional(),
    userEmail: zod_1.z.string().email().optional(),
    action: zod_1.z.enum([
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
    resource: zod_1.z.string().optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    limit: zod_1.z.string().optional().default('100').transform(Number),
});
// ============================================================================
// ANALYTICS SCHEMAS
// ============================================================================
exports.AnalyticsQuerySchema = zod_1.z.object({
    metric: zod_1.z.enum([
        'patient_count',
        'appointments_today',
        'prescriptions_today',
        'clinical_notes_count',
        'active_medications',
        'consent_compliance',
    ]),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    clinicianId: zod_1.z.string().cuid().optional(),
});
// ============================================================================
// SEARCH SCHEMAS
// ============================================================================
exports.SearchQuerySchema = zod_1.z.object({
    query: zod_1.z.string().min(1, 'Search query is required'),
    type: zod_1.z.enum(['patients', 'prescriptions', 'clinical_notes', 'appointments', 'all']).optional().default('all'),
    limit: zod_1.z.string().optional().default('20').transform(Number),
    offset: zod_1.z.string().optional().default('0').transform(Number),
});
//# sourceMappingURL=schemas.js.map