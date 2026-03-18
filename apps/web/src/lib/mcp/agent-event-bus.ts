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
        update_medication: ['medications'],
        create_prescription: ['prescriptions'],
        update_prescription: ['prescriptions'],
        send_to_pharmacy: ['prescriptions'],
        refill_medication: ['prescriptions', 'medications'],
        update_prescription_status: ['prescriptions'],
        list_prescriptions: [],

        // Appointments
        create_appointment: ['appointments'],
        update_appointment: ['appointments'],
        cancel_appointment: ['appointments'],
        reschedule_appointment: ['appointments'],
        get_available_slots: [],

        // Patients
        create_patient: ['patients'],
        update_patient: ['patients'],
        delete_patient: ['patients'],
        get_patient: [],

        // Messaging
        create_message: ['messages'],
        get_conversations: [],

        // Forms
        create_form: ['forms'],
        send_form: ['forms'],

        // Consent
        create_consent: ['consents'],
        revoke_consent: ['consents'],

        // Notifications
        send_notification: ['notifications'],
        mark_notification_read: ['notifications'],
        mark_all_notifications_read: ['notifications'],

        // Prevention & Screening
        create_prevention_plan: ['prevention-plans'],
        add_screening: ['screenings'],
        complete_screening: ['screenings', 'prevention-plans'],

        // Clinical Notes / Scribe
        start_recording_session: ['recordings'],

        // Documents
        create_document: ['documents'],
        share_document: ['documents'],

        // Lab Orders
        create_lab_order: ['lab-orders'],
        create_lab_result: ['lab-results'],
        update_lab_result: ['lab-results'],

        // Scheduling
        create_time_off: ['schedule'],
        set_clinician_availability: ['schedule'],

        // Tasks
        create_task: ['tasks'],
        update_task: ['tasks'],
        complete_task: ['tasks'],
        delete_task: ['tasks'],

        // Allergies
        create_allergy: ['allergies'],
        update_allergy: ['allergies'],
    };

    return mapping[toolName] ?? [];
}
