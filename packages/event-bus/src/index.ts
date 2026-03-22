/**
 * @holi/event-bus
 *
 * Health 3.0 — Typed Clinical Event Pub-Sub over Redis Streams
 *
 * ─── PUBLISHING ─────────────────────────────────────────────────────
 * import { EventPublisher } from '@holi/event-bus';
 * const publisher = new EventPublisher();
 * await publisher.publish({ type: 'record.ingested', payload: { ... } });
 *
 * ─── SUBSCRIBING ────────────────────────────────────────────────────
 * import { EventSubscriber } from '@holi/event-bus';
 * const sub = new EventSubscriber({ consumerGroup: 'prevention-engine' });
 * sub.subscribe('record.ingested', async (envelope) => { ... });
 * await sub.start();
 *
 * ─── TYPES ──────────────────────────────────────────────────────────
 * import type { ClinicalEvent, EventEnvelope, EventBusConfig } from '@holi/event-bus';
 */

export { EventPublisher } from './publisher';
export { EventSubscriber } from './subscriber';

export type {
  ClinicalEvent,
  ClinicalEventType,
  EventEnvelope,
  EventBusConfig,
  CanonicalRecordType,
  ValidationError,

  // Individual event types for consumers that need granular typing
  RecordIngestedEvent,
  RecordInvalidEvent,
  PreventionGapDetectedEvent,
  DrugInteractionDetectedEvent,
  LabCriticalResultEvent,
  SupplyStockoutEvent,
  SupplyItemReceivedEvent,
  EncounterStartedEvent,
  EncounterCompletedEvent,
  PrescriptionSignedEvent,
} from './types';
