/**
 * GET /api/events/stream
 *
 * Health 3.0 — Server-Sent Events (SSE) endpoint for real-time clinical events.
 *
 * Provides a persistent HTTP stream that the clinician dashboard subscribes to
 * for real-time prevention alerts, ingestion status, and encounter updates.
 *
 * Security:
 *   - CYRUS: Auth-gated — session required
 *   - CYRUS: Tenant isolation — only events for user's tenantId are delivered
 *   - CYRUS: NO PHI in SSE payloads — only references, not clinical values
 *
 * Implementation:
 *   - Auth check via session
 *   - Subscribes to Redis Streams for tenantId-scoped clinical events
 *   - Emits SSE format: "data: {json}\n\n"
 *   - Heartbeat every 30s to prevent proxy/load balancer timeouts
 *   - Cleanup on client disconnect (AbortController)
 */

import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { EventSubscriber } from '@holi/event-bus';
import type { ClinicalEventType, EventEnvelope } from '@holi/event-bus';

// Event types to stream to the clinician dashboard
const SUBSCRIBED_EVENT_TYPES: ClinicalEventType[] = [
  'record.ingested',
  'record.invalid',
  'prevention.gap.detected',
  'drug.interaction.detected',
  'lab.critical.result',
  'encounter.started',
  'encounter.completed',
];

const HEARTBEAT_INTERVAL_MS = 30_000;

export async function GET(request: NextRequest) {
  // ─── Auth Gate ─────────────────────────────────────────────────────────────
  // CYRUS: session required — no anonymous SSE subscriptions
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  // ─── Tenant Scoping ────────────────────────────────────────────────────────
  // CYRUS: only deliver events for the authenticated user's tenant
  const userTenantId = (session.user as Record<string, unknown>)['tenantId'] as string | undefined;
  if (!userTenantId) {
    return new Response('Forbidden: no tenantId associated with user', { status: 403 });
  }

  // ─── SSE Stream ────────────────────────────────────────────────────────────
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const write = (data: string) => {
    return writer.write(encoder.encode(data)).catch(() => {/* client disconnected */});
  };

  // Send initial connection event
  void write(`data: ${JSON.stringify({ type: 'connection.established', tenantId: userTenantId })}\n\n`);

  // ─── Redis Subscriber ───────────────────────────────────────────────────────
  const subscriber = new EventSubscriber({
    redisUrl: process.env.REDIS_URL,
    blockMs: 1000,
    consumerGroup: `sse-${userTenantId}`,
    consumerName: `sse-user-${session.user.id}-${Date.now()}`,
  });

  // Register handlers for each event type — tenant-scoped filtering
  for (const eventType of SUBSCRIBED_EVENT_TYPES) {
    subscriber.subscribe(eventType, async (envelope: EventEnvelope) => {
      // CYRUS: tenant isolation — only deliver events matching user's tenantId
      if (envelope.tenantId !== userTenantId) return;

      await write(`data: ${JSON.stringify(envelope)}\n\n`);
    });
  }

  // ─── Heartbeat ──────────────────────────────────────────────────────────────
  const heartbeatTimer = setInterval(() => {
    void write(`: heartbeat\n\n`);
  }, HEARTBEAT_INTERVAL_MS);

  // ─── Cleanup on disconnect ──────────────────────────────────────────────────
  request.signal.addEventListener('abort', () => {
    clearInterval(heartbeatTimer);
    void subscriber.stop();
    void writer.close();
  });

  // ─── Start subscriber (non-blocking) ───────────────────────────────────────
  // QUINN: subscriber.start() runs indefinitely — run in background, don't await
  void subscriber.start().catch(() => {
    // subscriber error — close stream
    clearInterval(heartbeatTimer);
    void writer.close();
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',  // disable nginx buffering for SSE
    },
  });
}
