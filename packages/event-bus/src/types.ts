/**
 * @holi/event-bus — Clinical Event Type Definitions
 *
 * Health 3.0 event schema. Every event flowing through the Redis Streams
 * bus is a discriminated union member of ClinicalEvent.
 *
 * CYRUS invariant: NO patient PHI in event payloads — use patientId refs only.
 * PII fields (CPF, email, name) MUST NOT appear here.
 *
 * @module @holi/event-bus/types
 */

// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL RECORD TYPES (mirrored from data-ingestion without creating a dep)
// ─────────────────────────────────────────────────────────────────────────────

export type CanonicalRecordType =
  | 'LAB_RESULT'
  | 'VITAL_SIGN'
  | 'DIAGNOSIS'
  | 'MEDICATION'
  | 'ALLERGY'
  | 'IMMUNIZATION'
  | 'IMAGING'
  | 'CLINICAL_NOTE'
  | 'PROCEDURE'
  | 'ENCOUNTER'
  | 'DEMOGRAPHICS'
  | 'SUPPLY_CHAIN'
  | 'DEVICE_READING';

export type ValidationError = {
  code: string;
  field: string;
  message: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// CLINICAL EVENT UNION TYPE
// ─────────────────────────────────────────────────────────────────────────────

/** Data ingestion events — fired by the ingest API route */
export type RecordIngestedEvent = {
  type: 'record.ingested';
  payload: {
    ingestId: string;
    recordType: CanonicalRecordType;
    patientId?: string;  // CYRUS: optional ref only, no PHI
    tenantId: string;
    sourceId: string;
    isValid: boolean;
    completenessScore: number;
  };
};

export type RecordInvalidEvent = {
  type: 'record.invalid';
  payload: {
    ingestId: string;
    sourceId: string;
    tenantId: string;
    errors: ValidationError[];
  };
};

/** Clinical alert events — fired by the prevention engine */
export type PreventionGapDetectedEvent = {
  type: 'prevention.gap.detected';
  payload: {
    patientId: string;
    rule: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    tenantId: string;
    alertId: string;
  };
};

export type DrugInteractionDetectedEvent = {
  type: 'drug.interaction.detected';
  payload: {
    patientId: string;
    drugs: string[];  // drug names only, no dosages (PHI risk)
    severity: string;
    tenantId: string;
  };
};

export type LabCriticalResultEvent = {
  type: 'lab.critical.result';
  payload: {
    patientId: string;
    testName: string;
    value: number;
    unit: string;
    tenantId: string;
  };
};

/** Supply chain events */
export type SupplyStockoutEvent = {
  type: 'supply.stockout.detected';
  payload: {
    facilityId: string;
    itemId: string;
    itemName: string;
    tenantId: string;
  };
};

export type SupplyItemReceivedEvent = {
  type: 'supply.item.received';
  payload: {
    facilityId: string;
    itemId: string;
    quantity: number;
    tenantId: string;
  };
};

/** Encounter lifecycle events */
export type EncounterStartedEvent = {
  type: 'encounter.started';
  payload: {
    patientId: string;
    clinicianId: string;
    tenantId: string;
    encounterId: string;
    encounterType?: string;
  };
};

export type EncounterCompletedEvent = {
  type: 'encounter.completed';
  payload: {
    patientId: string;
    noteId: string;
    tenantId: string;
    encounterId: string;
    encounterType?: string;
  };
};

export type PrescriptionSignedEvent = {
  type: 'prescription.signed';
  payload: {
    patientId: string;
    medications: string[];  // drug names only — CYRUS: no dosages in event bus
    tenantId: string;
    prescriptionId: string;
  };
};

/** Clinical encounter — complaint recorded */
export type ComplaintRecordedEvent = {
  type: 'complaint.recorded';
  payload: {
    complaintId: string;
    encounterId: string;
    patientId: string;
    tenantId: string;
    icdCode: string;
  };
};

/** Clinical encounter — family history updated (CYRUS: no ICD codes in events) */
export type FamilyHistoryUpdatedEvent = {
  type: 'family.history.updated';
  payload: {
    patientId: string;
    tenantId: string;
    relationship: string;
    conditionCount: number;
  };
};

/** Laudo médico generated from encounter */
export type LaudoMedicoGeneratedEvent = {
  type: 'laudo.medico.generated';
  payload: {
    encounterId: string;
    patientId: string;
    tenantId: string;
    encounterType: string;
    completenessScore: number;
  };
};

/**
 * Discriminated union of all clinical events.
 * Every event flowing through Redis Streams must be one of these types.
 */
export type ClinicalEvent =
  | RecordIngestedEvent
  | RecordInvalidEvent
  | PreventionGapDetectedEvent
  | DrugInteractionDetectedEvent
  | LabCriticalResultEvent
  | SupplyStockoutEvent
  | SupplyItemReceivedEvent
  | EncounterStartedEvent
  | EncounterCompletedEvent
  | PrescriptionSignedEvent
  | ComplaintRecordedEvent
  | FamilyHistoryUpdatedEvent
  | LaudoMedicoGeneratedEvent;

export type ClinicalEventType = ClinicalEvent['type'];

/**
 * Wire-format envelope wrapping every event on the stream.
 * CYRUS: NO PHI in the outer envelope — tenantId for routing only.
 */
export interface EventEnvelope<E extends ClinicalEvent = ClinicalEvent> {
  eventId: string;
  type: E['type'];
  payload: E['payload'];
  timestamp: string;   // ISO-8601
  tenantId: string;
  version: '1';
}

/** Configuration for connecting to Redis */
export interface EventBusConfig {
  redisUrl?: string;        // Defaults to REDIS_URL env var
  streamPrefix?: string;    // Defaults to 'clinical:'
  consumerGroup?: string;   // For competing consumers
  consumerName?: string;    // Unique per consumer instance
  blockMs?: number;         // XREAD block timeout (0 = forever, 1000ms for prod)
}
