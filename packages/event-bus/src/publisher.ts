/**
 * EventPublisher — publishes clinical events to Redis Streams.
 *
 * Usage:
 *   const publisher = new EventPublisher({ redisUrl: process.env.REDIS_URL });
 *   await publisher.publish({ type: 'record.ingested', payload: {...} });
 *   await publisher.disconnect();
 *
 * Stream key pattern: clinical:{eventType}
 * E.g. 'clinical:record.ingested', 'clinical:prevention.gap.detected'
 *
 * CYRUS invariant: NO PHI in event payloads. patientId refs only.
 * QUINN invariant: wrap Redis calls in try/catch; never crash caller on event bus failure.
 */

import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import type { ClinicalEvent, EventBusConfig, EventEnvelope } from './types';

export class EventPublisher {
  private redis: Redis;
  private streamPrefix: string;
  private connected = true;

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
  }

  /**
   * Publish a clinical event to the appropriate Redis Stream.
   * Fire-and-forget safe: returns the Redis message ID on success,
   * or throws on failure (caller decides whether to suppress).
   *
   * CIRCUIT_BREAKER NOTE: callers in API routes should wrap in try/catch
   * and set fire-and-forget to avoid blocking the HTTP response.
   */
  async publish<E extends ClinicalEvent>(event: E): Promise<string> {
    const envelope: EventEnvelope<E> = {
      eventId: randomUUID(),
      type: event.type,
      payload: event.payload,
      timestamp: new Date().toISOString(),
      tenantId: (event.payload as Record<string, unknown>)['tenantId'] as string ?? '',
      version: '1',
    };

    const streamKey = `${this.streamPrefix}${event.type}`;
    const messageId = await this.redis.xadd(
      streamKey,
      '*',
      'eventId', envelope.eventId,
      'type', envelope.type,
      'tenantId', envelope.tenantId,
      'timestamp', envelope.timestamp,
      'version', envelope.version,
      'payload', JSON.stringify(envelope.payload),
    );

    if (!messageId) {
      throw new Error(`EventPublisher: XADD to ${streamKey} returned null — stream may be full or Redis unavailable`);
    }

    return messageId;
  }

  /**
   * Publish multiple events in a single pipeline for efficiency.
   * Returns an array of message IDs in the same order.
   */
  async publishBatch<E extends ClinicalEvent>(events: E[]): Promise<string[]> {
    const pipeline = this.redis.pipeline();

    const envelopes: EventEnvelope[] = events.map(event => ({
      eventId: randomUUID(),
      type: event.type,
      payload: event.payload,
      timestamp: new Date().toISOString(),
      tenantId: (event.payload as Record<string, unknown>)['tenantId'] as string ?? '',
      version: '1' as const,
    }));

    for (const envelope of envelopes) {
      const streamKey = `${this.streamPrefix}${envelope.type}`;
      pipeline.xadd(
        streamKey,
        '*',
        'eventId', envelope.eventId,
        'type', envelope.type,
        'tenantId', envelope.tenantId,
        'timestamp', envelope.timestamp,
        'version', envelope.version,
        'payload', JSON.stringify(envelope.payload),
      );
    }

    const results = await pipeline.exec();
    return (results ?? []).map((result: [Error | null, unknown]) => {
      const [pipeErr, id] = result;
      if (pipeErr) throw pipeErr;
      return id as string;
    });
  }

  /** Gracefully disconnect from Redis. */
  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.redis.quit();
      this.connected = false;
    }
  }

  /** Expose underlying Redis instance for testing or advanced usage. */
  getRedis(): Redis {
    return this.redis;
  }
}
