/**
 * SSE Server — Server-Sent Events endpoint for real-time clinical events
 *
 * Reference for src/app/api/events/route.ts
 *
 * Architecture: Next.js App Router GET handler returning ReadableStream
 * with text/event-stream content type. Tenant-scoped event delivery.
 *
 * Events: ClinicalAlertEvent, MessageReceivedEvent, DeliveryUpdateEvent,
 *         ScreeningCompleteEvent, EncounterUpdatedEvent
 *
 * CYRUS: auth required, tenant isolation, audit on connect/disconnect
 *
 * @see sprint5-assets/comms-architecture.json — realtime.events
 * @see sprint5-assets/api-contracts.json — event types
 */

import { NextRequest, NextResponse } from 'next/server';
// TODO: holilabsv2 — import from your auth setup
// import { getServerSession } from 'next-auth/next';
// import { authOptions } from '@/lib/auth';
// import { prisma } from '@/lib/prisma';

// ─── Event Types (discriminated union) ───────────────────────────────────────

interface BaseEvent {
  id: string;
  timestamp: string;
  organizationId: string;
}

export interface ClinicalAlertEvent extends BaseEvent {
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

export interface MessageReceivedEvent extends BaseEvent {
  type: 'message_received';
  data: {
    conversationId: string;
    messageId: string;
    patientName: string;
    channel: 'WHATSAPP' | 'SMS' | 'EMAIL' | 'IN_APP';
    preview: string; // First 100 chars, NO PHI (RUTH invariant)
  };
}

export interface DeliveryUpdateEvent extends BaseEvent {
  type: 'delivery_update';
  data: {
    messageId: string;
    conversationId: string;
    status: 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
    errorCode?: string;
  };
}

export interface ScreeningCompleteEvent extends BaseEvent {
  type: 'screening_complete';
  data: {
    patientId: string;
    instrumentId: string;
    score: number;
    severity: string;
    triggeredRules: string[];
  };
}

export interface EncounterUpdatedEvent extends BaseEvent {
  type: 'encounter_updated';
  data: {
    encounterId: string;
    patientId: string;
    status: string;
    updatedField?: string;
  };
}

export type SSEEvent =
  | ClinicalAlertEvent
  | MessageReceivedEvent
  | DeliveryUpdateEvent
  | ScreeningCompleteEvent
  | EncounterUpdatedEvent;

// ─── Event Bus (in-memory, single-process) ───────────────────────────────────
// For multi-process: replace with Redis pub/sub (see event-emitter.scaffold.ts)

type EventCallback = (event: SSEEvent) => void;

const subscribers = new Map<string, Set<EventCallback>>();

export function subscribe(organizationId: string, callback: EventCallback): () => void {
  if (!subscribers.has(organizationId)) {
    subscribers.set(organizationId, new Set());
  }
  subscribers.get(organizationId)!.add(callback);

  // Return unsubscribe function
  return () => {
    const subs = subscribers.get(organizationId);
    if (subs) {
      subs.delete(callback);
      if (subs.size === 0) subscribers.delete(organizationId);
    }
  };
}

export function getConnectionCount(organizationId?: string): number {
  if (organizationId) return subscribers.get(organizationId)?.size ?? 0;
  let total = 0;
  subscribers.forEach((subs) => { total += subs.size; });
  return total;
}

// ─── GET Handler — SSE Endpoint ──────────────────────────────────────────────

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // ── Auth Check ──────────────────────────────────────────────────────────
  // TODO: holilabsv2 — uncomment and use your actual auth
  // const session = await getServerSession(authOptions);
  // if (!session?.user) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }
  // const organizationId = session.user.organizationId;
  // const userId = session.user.id;

  // Placeholder for scaffold — remove when wiring real auth
  const organizationId = 'org_holilabs_demo';
  const userId = 'user_dr_ricardo';

  // ── Rate Limit: max 10 SSE connections per user ─────────────────────────
  // TODO: holilabsv2 — implement per-user connection tracking
  // const userConnections = getConnectionCountByUser(userId);
  // if (userConnections >= 10) {
  //   return NextResponse.json({ error: 'Too many SSE connections' }, { status: 429 });
  // }

  // ── CYRUS: Audit connection open ────────────────────────────────────────
  // TODO: holilabsv2 — prisma.auditLog.create({
  //   data: { actionType: 'SSE_CONNECT', userId, entityType: 'EventStream', accessReason: 'TREATMENT' }
  // });

  // ── Stream Setup ────────────────────────────────────────────────────────

  let unsubscribe: (() => void) | null = null;
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send retry directive (client reconnect interval)
      controller.enqueue(encoder.encode('retry: 3000\n\n'));

      // Send initial connection confirmation
      const connectEvent = `event: connected\ndata: ${JSON.stringify({
        userId,
        organizationId,
        timestamp: new Date().toISOString(),
        activeConnections: getConnectionCount(organizationId) + 1,
      })}\n\n`;
      controller.enqueue(encoder.encode(connectEvent));

      // Subscribe to organization events
      unsubscribe = subscribe(organizationId, (event: SSEEvent) => {
        try {
          const sseMessage = `event: ${event.type}\nid: ${event.id}\ndata: ${JSON.stringify(event.data)}\n\n`;
          controller.enqueue(encoder.encode(sseMessage));
        } catch {
          // Stream closed — cleanup will handle
        }
      });

      // Heartbeat every 30 seconds
      heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`:keepalive ${new Date().toISOString()}\n\n`));
        } catch {
          // Stream closed
          cleanup();
        }
      }, 30_000);
    },

    cancel() {
      cleanup();
    },
  });

  function cleanup() {
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }

    // CYRUS: Audit connection close
    // TODO: holilabsv2 — prisma.auditLog.create({
    //   data: { actionType: 'SSE_DISCONNECT', userId, entityType: 'EventStream', accessReason: 'SYSTEM' }
    // });
  }

  // ── Response with SSE headers ───────────────────────────────────────────

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
