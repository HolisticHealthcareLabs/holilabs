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

// =============================================================================
// APPOINTMENT UPDATE SCHEMA
// =============================================================================

export const UpdateAppointmentSchema = z.object({
    appointmentId: z.string().describe('The appointment ID to update'),
    dateTime: z.string().optional().describe('New datetime (ISO 8601)'),
    duration: z.number().optional().describe('New duration in minutes'),
    status: z.enum(['PENDING', 'SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional().describe('New status'),
    type: z.enum(['CHECKUP', 'FOLLOW_UP', 'URGENT', 'TELEHEALTH', 'LAB', 'PROCEDURE']).optional().describe('New appointment type'),
    notes: z.string().optional().describe('Updated notes'),
    reason: z.string().optional().describe('Updated reason'),
});

export type UpdateAppointmentInput = z.infer<typeof UpdateAppointmentSchema>;

// =============================================================================
// MEDICATION UPDATE SCHEMA
// =============================================================================

export const UpdateMedicationSchema = z.object({
    medicationId: UUIDSchema.describe('The medication ID to update'),
    dose: z.string().optional().describe('New dosage (e.g., "20mg")'),
    frequency: z.string().optional().describe('New frequency (e.g., "once daily")'),
    instructions: z.string().optional().describe('Updated instructions'),
    notes: z.string().optional().describe('Updated notes'),
    isActive: z.boolean().optional().describe('Activate or deactivate medication'),
    route: z.enum(['oral', 'iv', 'im', 'subq', 'topical', 'inhalation', 'rectal', 'other']).optional().describe('Updated route'),
});

export type UpdateMedicationInput = z.infer<typeof UpdateMedicationSchema>;

// =============================================================================
// CLINICAL NOTE DELETE SCHEMA
// =============================================================================

export const DeleteClinicalNoteSchema = z.object({
    noteId: UUIDSchema.describe('The note ID to soft delete'),
    reason: z.string().min(5).describe('Reason for deletion (minimum 5 characters)'),
});

export type DeleteClinicalNoteInput = z.infer<typeof DeleteClinicalNoteSchema>;

// =============================================================================
// LAB RESULT SCHEMAS
// =============================================================================

export const LabResultStatusEnum = z.enum(['PRELIMINARY', 'FINAL', 'CORRECTED', 'CANCELLED']);

export const CreateLabResultSchema = z.object({
    patientId: UUIDSchema.describe('The patient ID'),
    testName: z.string().min(1).describe('Name of the lab test'),
    testCode: z.string().optional().describe('LOINC code for the test'),
    category: z.string().optional().describe('Test category (e.g., Hematology, Chemistry)'),
    value: z.string().describe('The result value'),
    unit: z.string().optional().describe('Unit of measurement (e.g., mg/dL)'),
    referenceRange: z.string().optional().describe('Normal reference range'),
    status: LabResultStatusEnum.default('PRELIMINARY').describe('Result status'),
    interpretation: z.string().optional().describe('Result interpretation (High, Low, Normal, Critical)'),
    isAbnormal: z.boolean().default(false).describe('Whether the result is abnormal'),
    isCritical: z.boolean().default(false).describe('Whether the result is critical'),
    collectedDate: z.string().optional().describe('When sample was collected (ISO 8601)'),
    orderingDoctor: z.string().optional().describe('Name of ordering physician'),
    performingLab: z.string().optional().describe('Name of performing laboratory'),
    notes: z.string().optional().describe('Additional notes'),
});

export const UpdateLabResultSchema = z.object({
    labResultId: UUIDSchema.describe('The lab result ID to update'),
    value: z.string().optional().describe('Updated result value'),
    status: LabResultStatusEnum.optional().describe('Updated status'),
    interpretation: z.string().optional().describe('Updated interpretation'),
    isAbnormal: z.boolean().optional().describe('Update abnormal flag'),
    isCritical: z.boolean().optional().describe('Update critical flag'),
    referenceRange: z.string().optional().describe('Updated reference range'),
    notes: z.string().optional().describe('Updated notes'),
});

export type CreateLabResultInput = z.infer<typeof CreateLabResultSchema>;
export type UpdateLabResultInput = z.infer<typeof UpdateLabResultSchema>;

// =============================================================================
// DOCUMENT SCHEMAS
// =============================================================================

export const DocumentTypeEnum = z.enum([
    'LAB_RESULTS',
    'IMAGING',
    'CONSULTATION_NOTES',
    'DISCHARGE_SUMMARY',
    'PRESCRIPTION',
    'INSURANCE',
    'CONSENT_FORM',
    'OTHER',
]);

export const ProcessingStatusEnum = z.enum([
    'PENDING',
    'UPLOADING',
    'PROCESSING',
    'DEIDENTIFYING',
    'EXTRACTING',
    'SYNCHRONIZED',
    'FAILED',
    'DELETED',
]);

export const CreateDocumentSchema = z.object({
    patientId: UUIDSchema.describe('The patient ID to attach the document to'),
    fileName: z.string().min(1).describe('Original file name'),
    fileType: z.string().min(1).describe('File type (e.g., pdf, jpg, docx)'),
    fileSize: z.number().int().min(1).describe('File size in bytes'),
    storageUrl: z.string().url().describe('URL where the document is stored'),
    documentType: DocumentTypeEnum.describe('Type of clinical document'),
    documentHash: z.string().optional().describe('SHA-256 hash of document (auto-generated if not provided)'),
    ocrText: z.string().optional().describe('Extracted text from OCR'),
    entities: z.record(z.any()).optional().describe('Extracted medical entities'),
});

export const GetDocumentSchema = z.object({
    documentId: UUIDSchema.describe('The document ID to retrieve'),
});

export const ListDocumentsSchema = z.object({
    patientId: UUIDSchema.describe('The patient ID to list documents for'),
    documentType: DocumentTypeEnum.optional().describe('Filter by document type'),
    startDate: z.string().optional().describe('Filter documents created after this date (ISO format)'),
    endDate: z.string().optional().describe('Filter documents created before this date (ISO format)'),
    processingStatus: ProcessingStatusEnum.optional().describe('Filter by processing status'),
    ...PaginationSchema.shape,
});

export const UpdateDocumentSchema = z.object({
    documentId: UUIDSchema.describe('The document ID to update'),
    fileName: z.string().min(1).optional().describe('Updated file name'),
    documentType: DocumentTypeEnum.optional().describe('Updated document type'),
    ocrText: z.string().optional().describe('Updated OCR text'),
    entities: z.record(z.any()).optional().describe('Updated medical entities'),
});

export const DeleteDocumentSchema = z.object({
    documentId: UUIDSchema.describe('The document ID to delete'),
    reason: z.string().min(5).describe('Reason for deletion'),
});

export const ShareDocumentSchema = z.object({
    documentId: UUIDSchema.describe('The document ID to share'),
    recipientEmail: z.string().email().optional().describe('Email of the recipient'),
    recipientName: z.string().optional().describe('Name of the recipient'),
    purpose: z.string().optional().describe('Purpose of sharing'),
    expiresInHours: z.number().int().min(1).max(720).default(24).describe('Hours until share link expires'),
    allowDownload: z.boolean().default(true).describe('Allow recipient to download'),
    requirePassword: z.boolean().default(false).describe('Require password to access'),
    maxAccesses: z.number().int().min(1).optional().describe('Maximum number of accesses'),
});

// =============================================================================
// FORM SCHEMAS
// =============================================================================

export const FormCategoryEnum = z.enum([
    'CONSENT',
    'HIPAA_AUTHORIZATION',
    'MEDICAL_HISTORY',
    'TREATMENT_CONSENT',
    'FINANCIAL_AGREEMENT',
    'INSURANCE_INFORMATION',
    'REFERRAL',
    'CUSTOM',
]);

export const FormStatusEnum = z.enum([
    'PENDING',
    'VIEWED',
    'IN_PROGRESS',
    'SUBMITTED',
    'SIGNED',
    'EXPIRED',
    'CANCELLED',
]);

export const CreateFormSchema = z.object({
    title: z.string().min(1).describe('Form template title'),
    description: z.string().optional().describe('Form description'),
    category: FormCategoryEnum.describe('Form category'),
    structure: z.record(z.any()).optional().describe('Form structure definition (fields, logic)'),
    fileUrl: z.string().url().optional().describe('URL to uploaded form template file'),
    fileType: z.string().optional().describe('File type if using file-based form'),
    tags: z.array(z.string()).default([]).describe('Tags for categorization'),
    estimatedMinutes: z.number().int().min(1).optional().describe('Estimated time to complete'),
});

export const SendFormSchema = z.object({
    templateId: UUIDSchema.describe('The form template ID to send'),
    patientId: UUIDSchema.describe('The patient ID to send the form to'),
    expiresInDays: z.number().int().min(1).max(90).default(7).describe('Days until form expires'),
});

export const GetFormResponsesSchema = z.object({
    formInstanceId: UUIDSchema.describe('The form instance ID to get responses for'),
});

export const ListFormsSchema = z.object({
    category: FormCategoryEnum.optional().describe('Filter by form category'),
    isActive: z.boolean().default(true).describe('Filter by active status'),
    isBuiltIn: z.boolean().optional().describe('Filter by built-in templates'),
    ...PaginationSchema.shape,
});

export const GetFormInstanceSchema = z.object({
    formInstanceId: UUIDSchema.describe('The form instance ID'),
});

export const ListFormInstancesSchema = z.object({
    patientId: UUIDSchema.describe('The patient ID to list form instances for'),
    status: FormStatusEnum.optional().describe('Filter by form status'),
    ...PaginationSchema.shape,
});

// =============================================================================
// PORTAL SCHEMAS (Notifications & Preferences)
// =============================================================================

export const NotificationTypeEnum = z.enum([
    'APPOINTMENT_REMINDER',
    'APPOINTMENT_CONFIRMED',
    'APPOINTMENT_CANCELLED',
    'APPOINTMENT_RESCHEDULED',
    'NEW_MESSAGE',
    'MESSAGE_REPLY',
    'NEW_DOCUMENT',
    'DOCUMENT_SHARED',
    'NEW_PRESCRIPTION',
    'PRESCRIPTION_READY',
    'LAB_RESULT_AVAILABLE',
    'MEDICATION_REMINDER',
    'CONSULTATION_COMPLETED',
    'SOAP_NOTE_READY',
    'CONSENT_REQUIRED',
    'PAYMENT_DUE',
    'PAYMENT_RECEIVED',
    'SYSTEM_ALERT',
    'SECURITY_ALERT',
]);

export const NotificationPriorityEnum = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']);

export const RecipientTypeEnum = z.enum(['CLINICIAN', 'PATIENT']);

export const GetNotificationsSchema = z.object({
    recipientId: UUIDSchema.describe('The recipient ID (clinician or patient)'),
    recipientType: RecipientTypeEnum.describe('Type of recipient'),
    isRead: z.boolean().optional().describe('Filter by read status'),
    type: NotificationTypeEnum.optional().describe('Filter by notification type'),
    priority: NotificationPriorityEnum.optional().describe('Filter by priority'),
    ...PaginationSchema.shape,
});

export const MarkNotificationReadSchema = z.object({
    notificationId: UUIDSchema.describe('The notification ID to mark as read'),
});

export const MarkAllNotificationsReadSchema = z.object({
    recipientId: UUIDSchema.describe('The recipient ID'),
    recipientType: RecipientTypeEnum.describe('Type of recipient'),
});

export const CreateNotificationSchema = z.object({
    recipientId: UUIDSchema.describe('The recipient ID'),
    recipientType: RecipientTypeEnum.describe('Type of recipient'),
    type: NotificationTypeEnum.describe('Notification type'),
    title: z.string().min(1).describe('Notification title'),
    message: z.string().min(1).describe('Notification message'),
    actionUrl: z.string().optional().describe('URL for action button'),
    actionLabel: z.string().optional().describe('Label for action button'),
    resourceType: z.string().optional().describe('Related resource type'),
    resourceId: z.string().optional().describe('Related resource ID'),
    priority: NotificationPriorityEnum.default('NORMAL').describe('Notification priority'),
    expiresAt: z.string().optional().describe('Expiration date (ISO format)'),
});

// Preferences schemas (subset of PatientPreferences/ClinicianPreferences)
export const PreferencesTypeEnum = z.enum(['PATIENT', 'CLINICIAN']);

export const GetPreferencesSchema = z.object({
    userId: UUIDSchema.describe('The user/patient ID'),
    userType: PreferencesTypeEnum.describe('Type of user'),
});

export const UpdatePreferencesSchema = z.object({
    userId: UUIDSchema.describe('The user/patient ID'),
    userType: PreferencesTypeEnum.describe('Type of user'),
    preferences: z.object({
        // SMS Preferences
        smsEnabled: z.boolean().optional(),
        smsAppointments: z.boolean().optional(),
        smsPrescriptions: z.boolean().optional(),
        smsResults: z.boolean().optional(),
        smsReminders: z.boolean().optional(),
        smsMarketing: z.boolean().optional(),
        // Email Preferences
        emailEnabled: z.boolean().optional(),
        emailAppointments: z.boolean().optional(),
        emailPrescriptions: z.boolean().optional(),
        emailResults: z.boolean().optional(),
        emailReminders: z.boolean().optional(),
        emailMarketing: z.boolean().optional(),
        // Push Preferences
        pushEnabled: z.boolean().optional(),
        pushAppointments: z.boolean().optional(),
        pushPrescriptions: z.boolean().optional(),
        pushResults: z.boolean().optional(),
        pushMessages: z.boolean().optional(),
        // WhatsApp
        whatsappEnabled: z.boolean().optional(),
        // Global Settings
        allowEmergencyOverride: z.boolean().optional(),
        quietHoursStart: z.string().optional(),
        quietHoursEnd: z.string().optional(),
        timezone: z.string().optional(),
    }).describe('Preferences to update'),
});

// =============================================================================
// DOCUMENT TYPE EXPORTS
// =============================================================================

export type CreateDocumentInput = z.infer<typeof CreateDocumentSchema>;
export type GetDocumentInput = z.infer<typeof GetDocumentSchema>;
export type ListDocumentsInput = z.infer<typeof ListDocumentsSchema>;
export type UpdateDocumentInput = z.infer<typeof UpdateDocumentSchema>;
export type DeleteDocumentInput = z.infer<typeof DeleteDocumentSchema>;
export type ShareDocumentInput = z.infer<typeof ShareDocumentSchema>;

// =============================================================================
// FORM TYPE EXPORTS
// =============================================================================

export type CreateFormInput = z.infer<typeof CreateFormSchema>;
export type SendFormInput = z.infer<typeof SendFormSchema>;
export type GetFormResponsesInput = z.infer<typeof GetFormResponsesSchema>;
export type ListFormsInput = z.infer<typeof ListFormsSchema>;
export type GetFormInstanceInput = z.infer<typeof GetFormInstanceSchema>;
export type ListFormInstancesInput = z.infer<typeof ListFormInstancesSchema>;

// =============================================================================
// PORTAL TYPE EXPORTS
// =============================================================================

export type GetNotificationsInput = z.infer<typeof GetNotificationsSchema>;
export type MarkNotificationReadInput = z.infer<typeof MarkNotificationReadSchema>;
export type MarkAllNotificationsReadInput = z.infer<typeof MarkAllNotificationsReadSchema>;
export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>;
export type GetPreferencesInput = z.infer<typeof GetPreferencesSchema>;
export type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesSchema>;
