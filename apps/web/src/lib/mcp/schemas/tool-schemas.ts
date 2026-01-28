/**
 * MCP Tool Schemas - Zod schemas for agent tool inputs
 * 
 * These schemas define the input validation for all MCP tools,
 * ensuring type safety and proper error messages for agents.
 */

import { z } from 'zod';

// =============================================================================
// COMMON SCHEMAS
// =============================================================================

export const UUIDSchema = z.string().uuid('Must be a valid UUID');

export const PaginationSchema = z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
});

// =============================================================================
// PATIENT SCHEMAS
// =============================================================================

export const GetPatientSchema = z.object({
    patientId: UUIDSchema.describe('The unique patient identifier'),
});

export const SearchPatientsSchema = z.object({
    query: z.string().min(1).describe('Search query (name, MRN, or condition)'),
    filters: z.object({
        isActive: z.boolean().optional(),
        hasUpcomingAppointment: z.boolean().optional(),
        conditionContains: z.string().optional(),
    }).optional(),
    ...PaginationSchema.shape,
});

export const GetPatientMedicationsSchema = z.object({
    patientId: UUIDSchema.describe('The patient ID to get medications for'),
    activeOnly: z.boolean().default(true).describe('Only return active medications'),
});

export const GetPatientAllergiesSchema = z.object({
    patientId: UUIDSchema.describe('The patient ID to get allergies for'),
});

export const GetPatientConditionsSchema = z.object({
    patientId: UUIDSchema.describe('The patient ID to get conditions for'),
    activeOnly: z.boolean().default(true).describe('Only return active conditions'),
});

// =============================================================================
// CLINICAL NOTE SCHEMAS
// =============================================================================

export const NoteTypeEnum = z.enum(['SOAP', 'PROGRESS', 'PROCEDURE', 'CONSULT', 'DISCHARGE', 'H_AND_P']);

export const CreateClinicalNoteSchema = z.object({
    patientId: UUIDSchema.describe('The patient this note is for'),
    noteType: NoteTypeEnum.describe('Type of clinical note'),
    chiefComplaint: z.string().optional().describe('Chief complaint or reason for visit'),
    subjective: z.string().optional().describe('Subjective findings (patient-reported)'),
    objective: z.string().optional().describe('Objective findings (clinician-observed)'),
    assessment: z.string().optional().describe('Clinical assessment'),
    plan: z.string().optional().describe('Treatment plan'),
    content: z.string().optional().describe('Full note content (if not using SOAP format)'),
});

export const GetClinicalNotesSchema = z.object({
    patientId: UUIDSchema.describe('The patient to get notes for'),
    noteType: NoteTypeEnum.optional().describe('Filter by note type'),
    limit: z.number().int().min(1).max(50).default(10),
    includeContent: z.boolean().default(false).describe('Include full note content'),
});

export const UpdateClinicalNoteSchema = z.object({
    noteId: UUIDSchema.describe('The note ID to update'),
    subjective: z.string().optional(),
    objective: z.string().optional(),
    assessment: z.string().optional(),
    plan: z.string().optional(),
    content: z.string().optional(),
});

// =============================================================================
// GOVERNANCE SCHEMAS
// =============================================================================

export const CheckMedicationSafetySchema = z.object({
    patientId: UUIDSchema.describe('The patient to check safety for'),
    proposedMedication: z.string().describe('Name of medication being considered'),
    medicationClass: z.string().optional().describe('Drug class (e.g., "Beta-Blocker", "NSAID")'),
    dosage: z.string().optional().describe('Proposed dosage'),
});

export const RunSlowLaneAuditSchema = z.object({
    sessionId: UUIDSchema.describe('The session ID to audit'),
    content: z.string().describe('Content to audit for safety concerns'),
    context: z.object({
        patientId: z.string().optional(),
        noteType: z.string().optional(),
        clinicalContext: z.string().optional(),
    }).optional(),
});

export const LogGovernanceOverrideSchema = z.object({
    ruleId: z.string().describe('The rule ID being overridden'),
    reason: z.string().min(10).describe('Clinical justification for override (min 10 chars)'),
    sessionId: UUIDSchema.describe('Session ID for the override'),
});

export const GetGovernanceStatsSchema = z.object({
    timeRange: z.enum(['1h', '24h', '7d', '30d']).default('24h'),
});

// =============================================================================
// MEDICATION SCHEMAS
// =============================================================================

export const PrescribeMedicationSchema = z.object({
    patientId: UUIDSchema.describe('The patient to prescribe for'),
    medicationName: z.string().describe('Name of the medication'),
    dosage: z.string().describe('Dosage (e.g., "10mg")'),
    frequency: z.string().describe('Frequency (e.g., "twice daily", "q8h")'),
    route: z.enum(['oral', 'iv', 'im', 'subq', 'topical', 'inhalation', 'rectal', 'other']).default('oral'),
    duration: z.string().optional().describe('Duration of therapy'),
    instructions: z.string().optional().describe('Special instructions'),
    indication: z.string().describe('Reason for prescribing'),
});

export const GetMedicationInteractionsSchema = z.object({
    medications: z.array(z.string()).min(2).describe('List of medication names to check'),
});

export const DiscontinueMedicationSchema = z.object({
    medicationId: UUIDSchema.describe('The medication order ID to discontinue'),
    reason: z.string().describe('Reason for discontinuation'),
});

// =============================================================================
// DIAGNOSIS SCHEMAS
// =============================================================================

export const CreateDiagnosisSchema = z.object({
    patientId: UUIDSchema.describe('The patient to add diagnosis for'),
    code: z.string().describe('ICD-10 code'),
    description: z.string().describe('Diagnosis description'),
    type: z.enum(['primary', 'secondary', 'rule_out']).default('primary'),
    onsetDate: z.string().optional().describe('Date of onset (ISO format)'),
    notes: z.string().optional(),
});

export const GetPatientDiagnosesSchema = z.object({
    patientId: UUIDSchema.describe('The patient ID'),
    activeOnly: z.boolean().default(true),
});

// =============================================================================
// APPOINTMENT SCHEMAS
// =============================================================================

export const GetPatientAppointmentsSchema = z.object({
    patientId: UUIDSchema.describe('The patient ID'),
    upcoming: z.boolean().default(true).describe('Only future appointments'),
    limit: z.number().int().min(1).max(20).default(5),
});

export const CreateAppointmentSchema = z.object({
    patientId: UUIDSchema.describe('The patient ID'),
    startTime: z.string().describe('Appointment start time (ISO format)'),
    endTime: z.string().describe('Appointment end time (ISO format)'),
    type: z.enum(['CHECKUP', 'FOLLOW_UP', 'URGENT', 'PROCEDURE', 'CONSULTATION']),
    reason: z.string().optional(),
    notes: z.string().optional(),
});

// =============================================================================
// PATIENT CRUD SCHEMAS
// =============================================================================

export const CreatePatientSchema = z.object({
    firstName: z.string().min(1).describe('Patient first name'),
    lastName: z.string().min(1).describe('Patient last name'),
    dateOfBirth: z.string().describe('Date of birth (ISO format YYYY-MM-DD)'),
    gender: z.enum(['male', 'female', 'other', 'unknown']).optional().describe('Patient gender'),
    email: z.string().email().optional().describe('Patient email address'),
    phone: z.string().optional().describe('Patient phone number'),
    address: z.string().optional().describe('Street address'),
    city: z.string().optional().describe('City'),
    state: z.string().optional().describe('State/Province'),
    postalCode: z.string().optional().describe('Postal/ZIP code'),
    country: z.string().default('MX').describe('Country code'),
});

export const UpdatePatientSchema = z.object({
    patientId: UUIDSchema.describe('The patient ID to update'),
    firstName: z.string().min(1).optional().describe('Patient first name'),
    lastName: z.string().min(1).optional().describe('Patient last name'),
    gender: z.enum(['male', 'female', 'other', 'unknown']).optional(),
    email: z.string().email().optional().describe('Patient email address'),
    phone: z.string().optional().describe('Patient phone number'),
    address: z.string().optional().describe('Street address'),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
});

export const DeletePatientSchema = z.object({
    patientId: UUIDSchema.describe('The patient ID to deactivate (soft delete)'),
    reason: z.string().min(5).describe('Reason for deactivation'),
});

// =============================================================================
// DIAGNOSIS CRUD SCHEMAS
// =============================================================================

export const UpdateDiagnosisSchema = z.object({
    diagnosisId: UUIDSchema.describe('The diagnosis ID to update'),
    description: z.string().optional().describe('Updated diagnosis description'),
    status: z.enum(['ACTIVE', 'RESOLVED', 'RULED_OUT', 'CHRONIC', 'RECURRENCE', 'RELAPSE', 'INACTIVE', 'REMISSION']).optional(),
    severity: z.enum(['mild', 'moderate', 'severe', 'critical']).optional(),
    isPrimary: z.boolean().optional().describe('Mark as primary diagnosis'),
    notes: z.string().optional().describe('Additional notes'),
    resolvedAt: z.string().optional().describe('Resolution date (ISO format) if status is RESOLVED'),
});

export const DeleteDiagnosisSchema = z.object({
    diagnosisId: UUIDSchema.describe('The diagnosis ID to remove'),
    reason: z.string().min(5).describe('Reason for removal'),
});

// =============================================================================
// ALLERGY CRUD SCHEMAS
// =============================================================================

export const AllergyTypeEnum = z.enum(['MEDICATION', 'FOOD', 'ENVIRONMENTAL', 'INSECT', 'LATEX', 'OTHER']);
export const AllergySeverityEnum = z.enum(['MILD', 'MODERATE', 'SEVERE', 'UNKNOWN']);
export const AllergyCategoryEnum = z.enum([
    'ANTIBIOTIC', 'ANALGESIC', 'ANESTHETIC', 'NSAID', 'OPIOID',
    'SHELLFISH', 'NUTS', 'DAIRY', 'GLUTEN', 'POLLEN', 'OTHER'
]);

export const CreateAllergySchema = z.object({
    patientId: UUIDSchema.describe('The patient ID to add allergy for'),
    allergen: z.string().min(1).describe('Name of the allergen (e.g., Penicillin, Peanuts)'),
    allergyType: AllergyTypeEnum.describe('Type of allergy'),
    severity: AllergySeverityEnum.describe('Severity level'),
    reactions: z.array(z.string()).min(1).describe('List of reactions (e.g., Hives, Anaphylaxis)'),
    category: AllergyCategoryEnum.optional().describe('Category for medication allergies'),
    onsetDate: z.string().optional().describe('Date allergy was first observed (ISO format)'),
    notes: z.string().optional().describe('Additional notes'),
    crossReactiveWith: z.array(z.string()).optional().describe('Related substances to avoid'),
});

export const UpdateAllergySchema = z.object({
    allergyId: UUIDSchema.describe('The allergy ID to update'),
    severity: AllergySeverityEnum.optional().describe('Updated severity level'),
    reactions: z.array(z.string()).optional().describe('Updated list of reactions'),
    notes: z.string().optional().describe('Additional notes'),
    verificationStatus: z.enum(['UNVERIFIED', 'PATIENT_REPORTED', 'CLINICIAN_VERIFIED', 'CHALLENGED', 'CONFIRMED_BY_TESTING']).optional(),
    crossReactiveWith: z.array(z.string()).optional().describe('Related substances to avoid'),
});

export const DeleteAllergySchema = z.object({
    allergyId: UUIDSchema.describe('The allergy ID to deactivate'),
    reason: z.string().min(5).describe('Reason for removal (e.g., allergy disproved by testing)'),
});

// =============================================================================
// FEATURE FLAG SCHEMAS
// =============================================================================

export const CreateFeatureFlagSchema = z.object({
    name: z.string().min(1).describe('Flag name (e.g., ai.diagnosis.enabled)'),
    description: z.string().optional().describe('Description of what this flag controls'),
    enabled: z.boolean().default(true).describe('Whether the flag is enabled'),
    clinicId: z.string().optional().describe('Clinic ID for clinic-specific override (null for global)'),
    reason: z.string().optional().describe('Reason for creating this flag'),
});

export const GetFeatureFlagSchema = z.object({
    name: z.string().min(1).describe('Flag name to lookup'),
    clinicId: z.string().optional().describe('Clinic ID for clinic-specific lookup'),
});

export const UpdateFeatureFlagSchema = z.object({
    flagId: UUIDSchema.describe('The feature flag ID to update'),
    enabled: z.boolean().optional().describe('Enable or disable the flag'),
    description: z.string().optional().describe('Updated description'),
    reason: z.string().min(5).describe('Reason for the change'),
});

export const DeleteFeatureFlagSchema = z.object({
    flagId: UUIDSchema.describe('The feature flag ID to delete'),
    reason: z.string().min(5).describe('Reason for deletion'),
});

// =============================================================================
// CONVERSATION/MESSAGING SCHEMAS
// =============================================================================

export const CreateConversationSchema = z.object({
    patientId: UUIDSchema.describe('The patient this conversation is about'),
    title: z.string().optional().describe('Optional title for the conversation'),
    description: z.string().optional().describe('Optional description'),
    participantIds: z.array(z.string()).min(1).describe('User IDs of participants'),
});

export const GetConversationsSchema = z.object({
    patientId: UUIDSchema.optional().describe('Filter by patient ID'),
    includeArchived: z.boolean().default(false).describe('Include archived conversations'),
    ...PaginationSchema.shape,
});

export const CreateMessageSchema = z.object({
    conversationId: UUIDSchema.describe('The conversation to add message to'),
    content: z.string().min(1).describe('Message content'),
    messageType: z.enum(['TEXT', 'IMAGE', 'FILE', 'SYSTEM']).default('TEXT'),
    replyToId: z.string().optional().describe('ID of message being replied to'),
});

export const GetMessagesSchema = z.object({
    conversationId: UUIDSchema.describe('The conversation to get messages from'),
    limit: z.number().int().min(1).max(100).default(50).describe('Number of messages to retrieve'),
    before: z.string().optional().describe('Get messages before this message ID (pagination)'),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type GetPatientInput = z.infer<typeof GetPatientSchema>;
export type SearchPatientsInput = z.infer<typeof SearchPatientsSchema>;
export type GetPatientMedicationsInput = z.infer<typeof GetPatientMedicationsSchema>;
export type GetPatientAllergiesInput = z.infer<typeof GetPatientAllergiesSchema>;
export type GetPatientConditionsInput = z.infer<typeof GetPatientConditionsSchema>;
export type CreateClinicalNoteInput = z.infer<typeof CreateClinicalNoteSchema>;
export type GetClinicalNotesInput = z.infer<typeof GetClinicalNotesSchema>;
export type UpdateClinicalNoteInput = z.infer<typeof UpdateClinicalNoteSchema>;
export type CheckMedicationSafetyInput = z.infer<typeof CheckMedicationSafetySchema>;
export type RunSlowLaneAuditInput = z.infer<typeof RunSlowLaneAuditSchema>;
export type LogGovernanceOverrideInput = z.infer<typeof LogGovernanceOverrideSchema>;
export type GetGovernanceStatsInput = z.infer<typeof GetGovernanceStatsSchema>;
export type PrescribeMedicationInput = z.infer<typeof PrescribeMedicationSchema>;
export type GetMedicationInteractionsInput = z.infer<typeof GetMedicationInteractionsSchema>;
export type DiscontinueMedicationInput = z.infer<typeof DiscontinueMedicationSchema>;
export type CreateDiagnosisInput = z.infer<typeof CreateDiagnosisSchema>;
export type GetPatientDiagnosesInput = z.infer<typeof GetPatientDiagnosesSchema>;
export type GetPatientAppointmentsInput = z.infer<typeof GetPatientAppointmentsSchema>;
export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;

// New CRUD type exports
export type CreatePatientInput = z.infer<typeof CreatePatientSchema>;
export type UpdatePatientInput = z.infer<typeof UpdatePatientSchema>;
export type DeletePatientInput = z.infer<typeof DeletePatientSchema>;
export type UpdateDiagnosisInput = z.infer<typeof UpdateDiagnosisSchema>;
export type DeleteDiagnosisInput = z.infer<typeof DeleteDiagnosisSchema>;
export type CreateAllergyInput = z.infer<typeof CreateAllergySchema>;
export type UpdateAllergyInput = z.infer<typeof UpdateAllergySchema>;
export type DeleteAllergyInput = z.infer<typeof DeleteAllergySchema>;
export type CreateFeatureFlagInput = z.infer<typeof CreateFeatureFlagSchema>;
export type GetFeatureFlagInput = z.infer<typeof GetFeatureFlagSchema>;
export type UpdateFeatureFlagInput = z.infer<typeof UpdateFeatureFlagSchema>;
export type DeleteFeatureFlagInput = z.infer<typeof DeleteFeatureFlagSchema>;
export type CreateConversationInput = z.infer<typeof CreateConversationSchema>;
export type GetConversationsInput = z.infer<typeof GetConversationsSchema>;
export type CreateMessageInput = z.infer<typeof CreateMessageSchema>;
export type GetMessagesInput = z.infer<typeof GetMessagesSchema>;
