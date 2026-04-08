/**
 * Agent Event Bus
 *
 * Lightweight in-process pub/sub for MCP tool completion events.
 * The SSE endpoint subscribes here; the registry publishes here.
 *
 * Single-instance per Node.js process (not multi-instance safe — use
 * Redis pub/sub when deploying to multi-replica environments).
 */

import { EventEmitter } from 'events';

export interface AgentToolEvent {
    type: 'tool_completed' | 'tool_failed';
    tool: string;
    category: string;
    success: boolean;
    /** Entities affected — frontend uses this to decide which queries to refetch */
    affectedEntities?: string[];
    clinicianId: string;
    agentId: string;
    timestamp: string;
}

class AgentEventBus extends EventEmitter {
    private static instance: AgentEventBus;

    private constructor() {
        super();
        // Prevent Node.js MaxListenersExceededWarning in dev (SSE clients)
        this.setMaxListeners(100);
    }

    static getInstance(): AgentEventBus {
        if (!AgentEventBus.instance) {
            AgentEventBus.instance = new AgentEventBus();
        }
        return AgentEventBus.instance;
    }

    publish(event: AgentToolEvent): void {
        this.emit('agent_event', event);
    }

    subscribe(listener: (event: AgentToolEvent) => void): () => void {
        this.on('agent_event', listener);
        return () => this.off('agent_event', listener);
    }
}

export const agentEventBus = AgentEventBus.getInstance();

/**
 * Derive which frontend data entities a tool call might affect,
 * so the UI can decide which React Query keys to invalidate.
 */
export function deriveAffectedEntities(toolName: string): string[] {
    const mapping: Record<string, string[]> = {
        // Clinical Notes
        create_clinical_note: ['clinical-notes'],
        update_clinical_note: ['clinical-notes'],
        delete_clinical_note: ['clinical-notes'],

        // Diagnoses
        create_diagnosis: ['diagnoses', 'patient-summary'],
        update_diagnosis: ['diagnoses', 'patient-summary'],
        delete_diagnosis: ['diagnoses', 'patient-summary'],

        // Medications & Prescriptions
        create_medication: ['medications'],
        create_medication_draft: ['medications'],
        update_medication: ['medications'],
        delete_medication: ['medications'],
        discontinue_medication: ['medications'],
        prescribe_medication: ['medications', 'prescriptions'],
        create_prescription: ['prescriptions'],
        update_prescription: ['prescriptions'],
        send_to_pharmacy: ['prescriptions'],
        refill_medication: ['prescriptions', 'medications'],
        update_prescription_status: ['prescriptions'],

        // Appointments
        create_appointment: ['appointments'],
        update_appointment: ['appointments'],
        delete_appointment: ['appointments'],
        cancel_appointment: ['appointments'],
        reschedule_appointment: ['appointments'],
        swap_appointments: ['appointments'],

        // Patients
        create_patient: ['patients'],
        update_patient: ['patients'],
        delete_patient: ['patients'],
        update_portal_contact_info: ['patients'],

        // Allergies
        create_allergy: ['allergies'],
        update_allergy: ['allergies'],
        delete_allergy: ['allergies'],

        // Messaging
        create_conversation: ['conversations'],
        update_conversation: ['conversations'],
        delete_conversation: ['conversations'],
        create_message: ['messages'],
        update_message: ['messages'],
        delete_message: ['messages'],

        // Forms
        create_form: ['forms'],
        update_form: ['forms'],
        delete_form: ['forms'],
        send_form: ['forms', 'form-instances'],
        update_form_instance: ['form-instances'],
        delete_form_instance: ['form-instances'],

        // Consent
        create_consent: ['consents'],
        revoke_consent: ['consents'],
        update_consent_preferences: ['consents'],

        // Notifications
        send_notification: ['notifications'],
        create_notification: ['notifications'],
        delete_notification: ['notifications'],
        mark_notification_read: ['notifications'],
        mark_all_notifications_read: ['notifications'],
        update_notification_preferences: ['notifications'],

        // Prevention & Screening
        create_prevention_plan: ['prevention-plans'],
        update_prevention_plan: ['prevention-plans'],
        delete_prevention_plan: ['prevention-plans'],
        add_screening: ['screenings'],
        complete_screening: ['screenings', 'prevention-plans'],
        create_prevention_task: ['prevention-tasks'],
        update_prevention_task: ['prevention-tasks'],

        // Scribe
        start_recording_session: ['recordings'],
        stop_recording_session: ['recordings'],
        delete_scribe_session: ['recordings'],
        finalize_clinical_note: ['clinical-notes', 'recordings'],
        update_transcription: ['recordings'],

        // Documents
        create_document: ['documents'],
        update_document: ['documents'],
        delete_document: ['documents'],
        share_document: ['documents'],
        share_document_with_patient: ['documents'],

        // Referrals
        create_referral: ['referrals'],
        update_referral: ['referrals'],
        delete_referral: ['referrals'],

        // Lab Orders & Results
        create_lab_order: ['lab-orders'],
        order_lab_panel: ['lab-orders'],
        create_lab_result: ['lab-results'],
        update_lab_result: ['lab-results'],
        delete_lab_result: ['lab-results'],
        flag_critical_result: ['lab-results'],

        // Scheduling
        create_time_off: ['schedule'],
        delete_time_off: ['schedule'],
        set_clinician_availability: ['schedule'],
        block_slot: ['schedule'],
        add_to_waitlist: ['waitlist'],
        remove_from_waitlist: ['waitlist'],

        // Tasks
        create_task: ['tasks'],
        update_task: ['tasks'],
        complete_task: ['tasks'],
        delete_task: ['tasks'],

        // Billing & Insurance
        create_patient_insurance: ['patient-insurance'],
        update_patient_insurance: ['patient-insurance'],
        update_insurance: ['patient-insurance'],
        submit_claim: ['claims'],
        update_claim_status: ['claims'],

        // Escalations
        create_escalation: ['escalations'],
        assign_escalation: ['escalations'],
        resolve_escalation: ['escalations'],

        // Feature Flags
        create_feature_flag: ['feature-flags'],
        update_feature_flag: ['feature-flags'],
        delete_feature_flag: ['feature-flags'],

        // Settings & Workspace
        update_user_settings: ['user-settings'],
        update_doctor_preferences: ['preferences'],
        update_preferences: ['preferences'],
        update_workspace_settings: ['workspace-settings'],

        // Imaging
        update_imaging_order: ['imaging'],
        share_study: ['imaging'],

        // Portal & Access
        approve_access_request: ['access-requests'],
        deny_access_request: ['access-requests'],

        // Roles
        grant_role: ['roles'],
        revoke_role: ['roles'],
    };

    return mapping[toolName] ?? [];
}
