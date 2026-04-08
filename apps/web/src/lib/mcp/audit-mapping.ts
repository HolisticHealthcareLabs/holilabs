import type { AuditAction, AccessReason } from '@prisma/client';

interface AuditMeta {
    action: AuditAction;
    resource: string;
    accessReason: AccessReason;
}

const FALLBACK: AuditMeta = {
    action: 'READ' as AuditAction,
    resource: 'MCP_TOOL_EXECUTION',
    accessReason: 'ADMINISTRATIVE' as AccessReason,
};

/**
 * Maps an MCP tool name to its corresponding AuditAction, resource type,
 * and LGPD access reason so agent audit entries match user API entries.
 */
export function deriveAuditMeta(toolName: string): AuditMeta {
    return TOOL_AUDIT_MAP[toolName] ?? inferFromName(toolName);
}

/** Extract resourceId from tool result data when available. */
export function extractResourceId(
    toolName: string,
    resultData: unknown,
): string {
    if (!resultData || typeof resultData !== 'object') return toolName;
    const data = resultData as Record<string, unknown>;
    // Most Prisma results return an object with `id`
    if (typeof data.id === 'string') return data.id;
    // Some tools return arrays — use the tool name as the resource ID
    if (Array.isArray(data)) return toolName;
    // Nested: some tools wrap in { patient: { id } } etc.
    for (const val of Object.values(data)) {
        if (val && typeof val === 'object' && 'id' in (val as Record<string, unknown>)) {
            return String((val as Record<string, unknown>).id);
        }
    }
    return toolName;
}

// ── Inference for unmapped tools ────────────────────────────────────────

function inferFromName(toolName: string): AuditMeta {
    const parts = toolName.split('_');
    const verb = parts[0];
    const entity = parts.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');

    const actionMap: Record<string, AuditAction> = {
        create: 'CREATE' as AuditAction,
        get: 'READ' as AuditAction,
        list: 'READ' as AuditAction,
        search: 'READ' as AuditAction,
        update: 'UPDATE' as AuditAction,
        delete: 'DELETE' as AuditAction,
        send: 'CREATE' as AuditAction,
        complete: 'UPDATE' as AuditAction,
        cancel: 'UPDATE' as AuditAction,
        revoke: 'REVOKE' as AuditAction,
        refill: 'PRESCRIBE' as AuditAction,
        start: 'CREATE' as AuditAction,
        stop: 'UPDATE' as AuditAction,
        share: 'CREATE' as AuditAction,
        mark: 'UPDATE' as AuditAction,
        add: 'CREATE' as AuditAction,
        assign: 'UPDATE' as AuditAction,
        resolve: 'UPDATE' as AuditAction,
    };

    const reasonMap: Record<string, AccessReason> = {
        create: 'DIRECT_PATIENT_CARE' as AccessReason,
        get: 'DIRECT_PATIENT_CARE' as AccessReason,
        list: 'DIRECT_PATIENT_CARE' as AccessReason,
        search: 'DIRECT_PATIENT_CARE' as AccessReason,
        update: 'DIRECT_PATIENT_CARE' as AccessReason,
        delete: 'ADMINISTRATIVE' as AccessReason,
        send: 'DIRECT_PATIENT_CARE' as AccessReason,
        revoke: 'ADMINISTRATIVE' as AccessReason,
    };

    return {
        action: actionMap[verb] ?? FALLBACK.action,
        resource: entity || FALLBACK.resource,
        accessReason: reasonMap[verb] ?? ('DIRECT_PATIENT_CARE' as AccessReason),
    };
}

// ── Explicit mapping for high-traffic tools ─────────────────────────────

const care: AccessReason = 'DIRECT_PATIENT_CARE' as AccessReason;
const admin: AccessReason = 'ADMINISTRATIVE' as AccessReason;
const billing: AccessReason = 'BILLING' as AccessReason;

const TOOL_AUDIT_MAP: Record<string, AuditMeta> = {
    // Patient
    create_patient:   { action: 'CREATE', resource: 'Patient', accessReason: care },
    get_patient:      { action: 'READ',   resource: 'Patient', accessReason: care },
    update_patient:   { action: 'UPDATE', resource: 'Patient', accessReason: care },
    delete_patient:   { action: 'DELETE', resource: 'Patient', accessReason: admin },
    search_patients:  { action: 'READ',   resource: 'Patient', accessReason: care },

    // Clinical Notes
    create_clinical_note: { action: 'CREATE', resource: 'ClinicalNote', accessReason: care },
    get_clinical_notes:   { action: 'READ',   resource: 'ClinicalNote', accessReason: care },
    update_clinical_note: { action: 'UPDATE', resource: 'ClinicalNote', accessReason: care },
    delete_clinical_note: { action: 'DELETE', resource: 'ClinicalNote', accessReason: care },

    // Diagnoses
    create_diagnosis: { action: 'CREATE', resource: 'Diagnosis', accessReason: care },
    update_diagnosis: { action: 'UPDATE', resource: 'Diagnosis', accessReason: care },
    delete_diagnosis: { action: 'DELETE', resource: 'Diagnosis', accessReason: care },

    // Medications
    create_medication_draft: { action: 'CREATE',    resource: 'Medication', accessReason: care },
    get_medication_by_id:    { action: 'READ',      resource: 'Medication', accessReason: care },
    update_medication:       { action: 'UPDATE',    resource: 'Medication', accessReason: care },
    delete_medication:       { action: 'DELETE',    resource: 'Medication', accessReason: care },
    discontinue_medication:  { action: 'UPDATE',    resource: 'Medication', accessReason: care },
    prescribe_medication:    { action: 'PRESCRIBE', resource: 'Medication', accessReason: care },
    get_interaction_data:    { action: 'READ',      resource: 'Medication', accessReason: care },

    // Prescriptions
    list_prescriptions:        { action: 'READ',      resource: 'Prescription', accessReason: care },
    get_prescription_status:   { action: 'READ',      resource: 'Prescription', accessReason: care },
    update_prescription_status:{ action: 'UPDATE',    resource: 'Prescription', accessReason: care },
    send_to_pharmacy:          { action: 'PRESCRIBE', resource: 'Prescription', accessReason: care },
    refill_medication:         { action: 'PRESCRIBE', resource: 'Prescription', accessReason: care },

    // Appointments
    create_appointment:    { action: 'CREATE', resource: 'Appointment', accessReason: care },
    get_appointment:       { action: 'READ',   resource: 'Appointment', accessReason: care },
    list_appointments:     { action: 'READ',   resource: 'Appointment', accessReason: care },
    update_appointment:    { action: 'UPDATE', resource: 'Appointment', accessReason: care },
    delete_appointment:    { action: 'DELETE', resource: 'Appointment', accessReason: admin },
    cancel_appointment:    { action: 'UPDATE', resource: 'Appointment', accessReason: care },
    reschedule_appointment:{ action: 'UPDATE', resource: 'Appointment', accessReason: care },

    // Allergies
    create_allergy: { action: 'CREATE', resource: 'Allergy', accessReason: care },
    update_allergy: { action: 'UPDATE', resource: 'Allergy', accessReason: care },
    delete_allergy: { action: 'DELETE', resource: 'Allergy', accessReason: care },

    // Consent
    create_consent:             { action: 'CREATE', resource: 'Consent', accessReason: admin },
    get_consent:                { action: 'READ',   resource: 'Consent', accessReason: admin },
    get_patient_consents:       { action: 'READ',   resource: 'Consent', accessReason: admin },
    revoke_consent:             { action: 'REVOKE', resource: 'Consent', accessReason: admin },
    update_consent_preferences: { action: 'UPDATE', resource: 'Consent', accessReason: admin },

    // Documents
    create_document: { action: 'CREATE', resource: 'Document', accessReason: care },
    get_document:    { action: 'READ',   resource: 'Document', accessReason: care },
    list_documents:  { action: 'READ',   resource: 'Document', accessReason: care },
    update_document: { action: 'UPDATE', resource: 'Document', accessReason: care },
    delete_document: { action: 'DELETE', resource: 'Document', accessReason: admin },
    share_document:  { action: 'CREATE', resource: 'Document', accessReason: care },

    // Referrals
    create_referral: { action: 'CREATE', resource: 'Referral', accessReason: care },
    get_referral:    { action: 'READ',   resource: 'Referral', accessReason: care },
    list_referrals:  { action: 'READ',   resource: 'Referral', accessReason: care },
    update_referral: { action: 'UPDATE', resource: 'Referral', accessReason: care },
    delete_referral: { action: 'DELETE', resource: 'Referral', accessReason: admin },

    // Lab
    create_lab_order:    { action: 'CREATE', resource: 'LabOrder',  accessReason: care },
    create_lab_result:   { action: 'CREATE', resource: 'LabResult', accessReason: care },
    update_lab_result:   { action: 'UPDATE', resource: 'LabResult', accessReason: care },
    delete_lab_result:   { action: 'DELETE', resource: 'LabResult', accessReason: care },
    get_lab_results_raw: { action: 'READ',   resource: 'LabResult', accessReason: care },

    // Forms
    create_form:  { action: 'CREATE', resource: 'FormTemplate', accessReason: admin },
    get_form:     { action: 'READ',   resource: 'FormTemplate', accessReason: admin },
    list_forms:   { action: 'READ',   resource: 'FormTemplate', accessReason: admin },
    update_form:  { action: 'UPDATE', resource: 'FormTemplate', accessReason: admin },
    delete_form:  { action: 'DELETE', resource: 'FormTemplate', accessReason: admin },
    send_form:    { action: 'CREATE', resource: 'FormInstance', accessReason: care },

    // Messaging
    create_conversation: { action: 'CREATE', resource: 'Conversation', accessReason: care },
    get_conversation:    { action: 'READ',   resource: 'Conversation', accessReason: care },
    get_conversations:   { action: 'READ',   resource: 'Conversation', accessReason: care },
    create_message:      { action: 'CREATE', resource: 'Message',      accessReason: care },
    get_messages:        { action: 'READ',   resource: 'Message',      accessReason: care },

    // Tasks
    create_task:   { action: 'CREATE', resource: 'ProviderTask', accessReason: admin },
    get_task:      { action: 'READ',   resource: 'ProviderTask', accessReason: admin },
    list_tasks:    { action: 'READ',   resource: 'ProviderTask', accessReason: admin },
    update_task:   { action: 'UPDATE', resource: 'ProviderTask', accessReason: admin },
    complete_task: { action: 'UPDATE', resource: 'ProviderTask', accessReason: admin },
    delete_task:   { action: 'DELETE', resource: 'ProviderTask', accessReason: admin },

    // Notifications
    send_notification:           { action: 'CREATE', resource: 'Notification', accessReason: admin },
    mark_notification_read:      { action: 'UPDATE', resource: 'Notification', accessReason: admin },
    mark_all_notifications_read: { action: 'UPDATE', resource: 'Notification', accessReason: admin },

    // Prevention
    create_prevention_plan:  { action: 'CREATE', resource: 'PreventionPlan', accessReason: care },
    get_prevention_plan:     { action: 'READ',   resource: 'PreventionPlan', accessReason: care },
    delete_prevention_plan:  { action: 'DELETE', resource: 'PreventionPlan', accessReason: care },
    add_screening:           { action: 'CREATE', resource: 'Screening',      accessReason: care },
    complete_screening:      { action: 'UPDATE', resource: 'Screening',      accessReason: care },

    // Scribe
    start_recording_session: { action: 'CREATE', resource: 'ScribeSession', accessReason: care },
    stop_recording_session:  { action: 'UPDATE', resource: 'ScribeSession', accessReason: care },
    get_recording_session:   { action: 'READ',   resource: 'ScribeSession', accessReason: care },
    delete_scribe_session:   { action: 'DELETE', resource: 'ScribeSession', accessReason: care },
    generate_soap_note:      { action: 'CREATE', resource: 'SOAPNote',      accessReason: care },

    // Governance
    evaluate_rule:            { action: 'READ',   resource: 'GovernanceRule',  accessReason: care },
    match_contraindications:  { action: 'READ',   resource: 'GovernanceRule',  accessReason: care },
    check_medication_safety:  { action: 'READ',   resource: 'GovernanceRule',  accessReason: care },
    log_governance_override:  { action: 'CREATE', resource: 'GovernanceLog',   accessReason: care },
    get_governance_stats:     { action: 'READ',   resource: 'GovernanceLog',   accessReason: admin },

    // Settings
    get_user_settings:        { action: 'READ',   resource: 'UserSettings',    accessReason: admin },
    update_user_settings:     { action: 'UPDATE', resource: 'UserSettings',    accessReason: admin },
    get_doctor_preferences:   { action: 'READ',   resource: 'DoctorPreferences', accessReason: admin },
    update_doctor_preferences:{ action: 'UPDATE', resource: 'DoctorPreferences', accessReason: admin },

    // Workspace
    get_workspace:             { action: 'READ',   resource: 'Workspace', accessReason: admin },
    update_workspace_settings: { action: 'UPDATE', resource: 'Workspace', accessReason: admin },

    // Billing / Insurance
    get_patient_insurance:    { action: 'READ',   resource: 'PatientInsurance', accessReason: billing },
    create_patient_insurance: { action: 'CREATE', resource: 'PatientInsurance', accessReason: billing },
    submit_claim:             { action: 'CREATE', resource: 'InsuranceClaim',   accessReason: billing },
    get_claim:                { action: 'READ',   resource: 'InsuranceClaim',   accessReason: billing },
    list_claims:              { action: 'READ',   resource: 'InsuranceClaim',   accessReason: billing },

    // Scheduling
    set_clinician_availability: { action: 'UPDATE', resource: 'ProviderAvailability', accessReason: admin },
    create_time_off:            { action: 'CREATE', resource: 'ProviderTimeOff',      accessReason: admin },
    get_time_off:               { action: 'READ',   resource: 'ProviderTimeOff',      accessReason: admin },
    delete_time_off:            { action: 'DELETE', resource: 'ProviderTimeOff',      accessReason: admin },

    // Feature Flags
    create_feature_flag: { action: 'CREATE', resource: 'FeatureFlag', accessReason: admin },
    get_feature_flag:    { action: 'READ',   resource: 'FeatureFlag', accessReason: admin },
    update_feature_flag: { action: 'UPDATE', resource: 'FeatureFlag', accessReason: admin },
    delete_feature_flag: { action: 'DELETE', resource: 'FeatureFlag', accessReason: admin },
} as Record<string, AuditMeta>;
