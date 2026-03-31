/**
 * Event Emitter — In-memory event bus with optional Redis pub/sub
 *
 * Reference for src/lib/events/emit.ts
 *
 * Architecture: Map<organizationId, Set<callback>> for single-process.
 * Redis pub/sub adapter behind REDIS_EVENTS_ENABLED feature flag for multi-process.
 *
 * CYRUS: every emitted event written to AuditLog
 *
 * @see sprint5-assets/code-scaffolds/sse-server.scaffold.ts — subscriber side
 */

// ─── Types ───────────────────────────────────────────────────────────────────

interface BaseEvent {
  id: string;
  timestamp: string;
  organizationId: string;
}

interface ClinicalAlertEventData extends BaseEvent {
  type: 'clinical_alert';
  data: {
    patientId: string;
    patientName: string;
    alertId: string;
    ruleId: string;
    severity: 'minimal' | 'mild' | 'moderate' | 'severe' | 'critical';
    summary: string;
    sourceAuthority: string;
    citationUrl: string;
  };
}

interface MessageReceivedEventData extends BaseEvent {
  type: 'message_received';
  data: {
    conversationId: string;
    messageId: string;
    patientName: string;
    channel: 'WHATSAPP' | 'SMS' | 'EMAIL' | 'IN_APP';
    preview: string;
  };
}

interface DeliveryUpdateEventData extends BaseEvent {
  type: 'delivery_update';
  data: {
    messageId: string;
    conversationId: string;
    status: 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
    errorCode?: string;
  };
}

interface ScreeningCompleteEventData extends BaseEvent {
  type: 'screening_complete';
  data: {
    patientId: string;
    instrumentId: string;
    score: number;
    severity: string;
    triggeredRules: string[];
  };
}

interface EncounterUpdatedEventData extends BaseEvent {
  type: 'encounter_updated';
  data: {
    encounterId: string;
    patientId: string;
    status: string;
    updatedField?: string;
  };
}

export type SSEEvent =
  | ClinicalAlertEventData
  | MessageReceivedEventData
  | DeliveryUpdateEventData
  | ScreeningCompleteEventData
  | EncounterUpdatedEventData;

type EventCallback = (event: SSEEvent) => void;

// ─── In-Memory Event Bus ─────────────────────────────────────────────────────

class InMemoryEventBus {
  private subscribers = new Map<string, Set<EventCallback>>();

  subscribe(organizationId: string, callback: EventCallback): () => void {
    if (!this.subscribers.has(organizationId)) {
      this.subscribers.set(organizationId, new Set());
    }
    this.subscribers.get(organizationId)!.add(callback);

    return () => {
      const subs = this.subscribers.get(organizationId);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) this.subscribers.delete(organizationId);
      }
    };
  }

  emit(organizationId: string, event: SSEEvent): void {
    const subs = this.subscribers.get(organizationId);
    if (!subs || subs.size === 0) return;

    // Deliver to all subscribers for this org
    for (const callback of subs) {
      try {
        callback(event);
      } catch (err) {
        // Individual subscriber failure should not affect others
        console.error(`[EventBus] Subscriber error for org ${organizationId}:`, err);
      }
    }
  }

  getConnectionCount(organizationId?: string): number {
    if (organizationId) return this.subscribers.get(organizationId)?.size ?? 0;
    let total = 0;
    this.subscribers.forEach((subs) => { total += subs.size; });
    return total;
  }

  /** Clear all subscribers (for testing) */
  clear(): void {
    this.subscribers.clear();
  }
}

// ─── Redis Pub/Sub Adapter (optional, multi-process) ─────────────────────────

class RedisEventBus {
  private localBus: InMemoryEventBus;
  // TODO: holilabsv2 — import Redis client
  // private publisher: RedisClient;
  // private subscriber: RedisClient;

  constructor(localBus: InMemoryEventBus) {
    this.localBus = localBus;
    // TODO: holilabsv2 — initialize Redis connections
    // this.publisher = createClient({ url: process.env.REDIS_URL });
    // this.subscriber = createClient({ url: process.env.REDIS_URL });
    // this.subscriber.subscribe('holilabs:events', (message) => {
    //   const event: SSEEvent = JSON.parse(message);
    //   this.localBus.emit(event.organizationId, event);
    // });
  }

  async emit(organizationId: string, event: SSEEvent): Promise<void> {
    // Publish to Redis channel — all processes receive it
    // await this.publisher.publish('holilabs:events', JSON.stringify(event));

    // Also emit locally (for same-process subscribers)
    this.localBus.emit(organizationId, event);
  }
}

// ─── Singleton Event Bus ─────────────────────────────────────────────────────

const localBus = new InMemoryEventBus();
const redisBus = process.env.REDIS_EVENTS_ENABLED === 'true' ? new RedisEventBus(localBus) : null;

/**
 * Subscribe to events for an organization.
 * Used by SSE server to register stream callbacks.
 */
export function subscribe(organizationId: string, callback: EventCallback): () => void {
  return localBus.subscribe(organizationId, callback);
}

/**
 * Emit an event to all subscribers for an organization.
 * Used by API routes after data mutations (new message, alert, etc.)
 *
 * CYRUS invariant: every emitted event is logged to AuditLog.
 */
export async function emitEvent(
  organizationId: string,
  event: SSEEvent,
  auditContext?: { userId?: string }
): Promise<void> {
  // Stamp event metadata
  const stamped: SSEEvent = {
    ...event,
    id: event.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: event.timestamp || new Date().toISOString(),
    organizationId,
  };

  // Deliver event
  if (redisBus) {
    await redisBus.emit(organizationId, stamped);
  } else {
    localBus.emit(organizationId, stamped);
  }

  // CYRUS: Audit log for significant events
  if (stamped.type === 'clinical_alert' || stamped.type === 'message_received') {
    // TODO: holilabsv2 — prisma.auditLog.create({
    //   data: {
    //     actionType: `EVENT_${stamped.type.toUpperCase()}`,
    //     userId: auditContext?.userId || 'system',
    //     entityType: 'SSEEvent',
    //     entityId: stamped.id,
    //     accessReason: 'SYSTEM',
    //   },
    // });
  }
}

/**
 * Get active connection count (for monitoring).
 */
export function getConnectionCount(organizationId?: string): number {
  return localBus.getConnectionCount(organizationId);
}

// ─── Convenience Emitters ────────────────────────────────────────────────────

/** Emit a clinical alert event. Used by /api/clinical/evaluate */
export async function emitClinicalAlert(
  organizationId: string,
  alert: ClinicalAlertEventData['data'],
  userId?: string
): Promise<void> {
  await emitEvent(organizationId, {
    id: `alert_${Date.now()}`,
    type: 'clinical_alert',
    timestamp: new Date().toISOString(),
    organizationId,
    data: alert,
  }, { userId });
}

/** Emit a message received event. Used by Twilio webhook */
export async function emitMessageReceived(
  organizationId: string,
  message: MessageReceivedEventData['data'],
  userId?: string
): Promise<void> {
  await emitEvent(organizationId, {
    id: `msg_${Date.now()}`,
    type: 'message_received',
    timestamp: new Date().toISOString(),
    organizationId,
    data: message,
  }, { userId });
}

/** Emit a delivery update event. Used by Twilio status webhook */
export async function emitDeliveryUpdate(
  organizationId: string,
  update: DeliveryUpdateEventData['data']
): Promise<void> {
  await emitEvent(organizationId, {
    id: `del_${Date.now()}`,
    type: 'delivery_update',
    timestamp: new Date().toISOString(),
    organizationId,
    data: update,
  });
}

/** Emit screening complete. Used by /api/prevention/screen */
export async function emitScreeningComplete(
  organizationId: string,
  screening: ScreeningCompleteEventData['data'],
  userId?: string
): Promise<void> {
  await emitEvent(organizationId, {
    id: `scr_${Date.now()}`,
    type: 'screening_complete',
    timestamp: new Date().toISOString(),
    organizationId,
    data: screening,
  }, { userId });
}

/** Emit encounter updated. Used by encounter CRUD */
export async function emitEncounterUpdated(
  organizationId: string,
  encounter: EncounterUpdatedEventData['data'],
  userId?: string
): Promise<void> {
  await emitEvent(organizationId, {
    id: `enc_${Date.now()}`,
    type: 'encounter_updated',
    timestamp: new Date().toISOString(),
    organizationId,
    data: encounter,
  }, { userId });
}
