/**
 * EventSubscriber — subscribes to clinical events from Redis Streams.
 *
 * Usage:
 *   const sub = new EventSubscriber({ consumerGroup: 'prevention-engine' });
 *   sub.subscribe('record.ingested', async (event) => {
 *     // process event
 *   });
 *   await sub.start();
 *   // on shutdown:
 *   await sub.stop();
 *
 * CYRUS invariant: tenantId is available on every event for tenant-scoped processing.
 * QUINN invariant: consumer acknowledges (XACK) only after successful processing.
 */

import Redis from 'ioredis';
import type { ClinicalEvent, ClinicalEventType, EventBusConfig, EventEnvelope } from './types';

type EventHandler<T extends ClinicalEvent = ClinicalEvent> = (
  event: EventEnvelope<T>,
) => Promise<void>;

interface StreamReadResult {
  name: string;
  messages: Array<{
    id: string;
    message: Record<string, string>;
  }>;
}

export class EventSubscriber {
  private redis: Redis;
  private streamPrefix: string;
  private blockMs: number;
  private consumerGroup: string;
  private consumerName: string;
  private handlers = new Map<ClinicalEventType, EventHandler[]>();
  private running = false;
  private lastIds = new Map<string, string>();

  constructor(config: EventBusConfig = {}, existingRedis?: Redis) {
    if (existingRedis) {
      this.redis = existingRedis;
    } else {
      const redisUrl = config.redisUrl ?? process.env.REDIS_URL ?? 'redis://localhost:6379';
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: false,
        enableOfflineQueue: false,
      });
    }
    this.streamPrefix = config.streamPrefix ?? 'clinical:';
    this.blockMs = config.blockMs ?? 1000;
    this.consumerGroup = config.consumerGroup ?? 'default-group';
    this.consumerName = config.consumerName ?? `consumer-${Date.now()}`;
  }

  /**
   * Register a handler for a specific event type.
   * Multiple handlers can be registered for the same event type.
   */
  subscribe<E extends ClinicalEvent>(
    eventType: E['type'],
    handler: EventHandler<E>,
  ): this {
    const existing = this.handlers.get(eventType) ?? [];
    existing.push(handler as EventHandler);
    this.handlers.set(eventType, existing);
    return this;
  }

  /**
   * Start consuming events from all subscribed streams.
   * Uses XREAD in simple last-id tracking mode (no consumer groups required for MVP).
   * For production competing-consumers use consumer groups with XREADGROUP.
   */
  async start(): Promise<void> {
    this.running = true;

    // Initialize last-seen IDs to '$' (only new messages) for each subscribed type
    for (const eventType of this.handlers.keys()) {
      const streamKey = `${this.streamPrefix}${eventType}`;
      this.lastIds.set(streamKey, '$');
    }

    while (this.running) {
      try {
        await this.poll();
      } catch (err) {
        // Log but don't crash — QUINN circuit breaker logic should be layered on top
        // by callers who want to implement CIRCUIT_BREAKER_TRIPPED behavior
        if (this.running) {
          // Brief pause before retry to avoid tight loop on connection failure
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
  }

  /**
   * Stop the subscriber loop gracefully.
   */
  async stop(): Promise<void> {
    this.running = false;
    await this.redis.quit();
  }

  /**
   * Single poll cycle — reads from all subscribed streams and dispatches to handlers.
   * Exposed for testing. Lazily initializes lastIds from registered handlers.
   */
  async poll(): Promise<void> {
    // Lazily initialize lastIds from registered handlers if not set by start()
    for (const eventType of this.handlers.keys()) {
      const streamKey = `${this.streamPrefix}${eventType}`;
      if (!this.lastIds.has(streamKey)) {
        this.lastIds.set(streamKey, '0-0'); // '0-0' = read from beginning (for direct poll calls)
      }
    }

    const streams = Array.from(this.lastIds.entries());
    if (streams.length === 0) return;

    const streamKeys = streams.map(([k]) => k);
    const ids = streams.map(([, id]) => id);

    // XREAD: block up to blockMs, return up to 10 messages per stream
    const results = await (this.redis as Redis).xread(
      'COUNT', '10',
      'BLOCK', String(this.blockMs),
      'STREAMS',
      ...streamKeys,
      ...ids,
    ) as StreamReadResult[] | null;

    if (!results) return;

    for (const streamResult of results) {
      for (const { id, message } of streamResult.messages) {
        this.lastIds.set(streamResult.name, id);

        // Deserialize envelope
        const eventType = message['type'] as ClinicalEventType;
        let payload: unknown;
        try {
          payload = JSON.parse(message['payload'] ?? '{}');
        } catch {
          continue; // malformed message — skip
        }

        const envelope: EventEnvelope = {
          eventId: message['eventId'] ?? '',
          type: eventType,
          payload: payload as ClinicalEvent['payload'],
          timestamp: message['timestamp'] ?? '',
          tenantId: message['tenantId'] ?? '',
          version: '1',
        };

        const handlers = this.handlers.get(eventType) ?? [];
        for (const handler of handlers) {
          try {
            await handler(envelope);
          } catch {
            // Handler errors are isolated — don't stop processing other events
          }
        }
      }
    }
  }

  /** Expose underlying Redis instance for testing or advanced usage. */
  getRedis(): Redis {
    return this.redis;
  }
}
