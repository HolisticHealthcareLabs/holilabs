/**
 * Health 3.0 Event Orchestrator
 *
 * Main event router consuming from the Redis Streams event bus.
 * Routes events to registered handlers and ensures idempotency
 * via the Health3ProcessedEvent table.
 *
 * Pattern: Follows PreventionWorker singleton pattern.
 * Fire-and-forget: consumes events async, never blocks publishers.
 * Idempotent: checks Health3ProcessedEvent before processing.
 *
 * CYRUS: tenantId required on every event.
 */

import type { PrismaClient } from '@prisma/client';
import type { ClinicalEvent, ClinicalEventType } from '@holi/event-bus';
import type { EventHandler, EventHandlerResult, HandlerContext } from './types';

// ---------------------------------------------------------------------------
// Handler Registry
// ---------------------------------------------------------------------------

const handlerRegistry = new Map<ClinicalEventType, EventHandler[]>();

/**
 * Registers an event handler for one or more event types.
 */
export function registerHandler(
  eventTypes: ClinicalEventType[],
  handler: EventHandler,
): void {
  for (const type of eventTypes) {
    const existing = handlerRegistry.get(type) ?? [];
    existing.push(handler);
    handlerRegistry.set(type, existing);
  }
}

/**
 * Returns the handler registry (for testing).
 */
export function getHandlerRegistry(): Map<ClinicalEventType, EventHandler[]> {
  return handlerRegistry;
}

/**
 * Clears the handler registry (for testing).
 */
export function clearHandlerRegistry(): void {
  handlerRegistry.clear();
}

// ---------------------------------------------------------------------------
// Idempotency Check
// ---------------------------------------------------------------------------

/**
 * Checks if an event has already been processed.
 * Uses Health3ProcessedEvent table for exactly-once semantics.
 */
export async function isEventProcessed(
  prisma: PrismaClient,
  eventId: string,
): Promise<boolean> {
  const existing = await prisma.health3ProcessedEvent.findUnique({
    where: { eventId },
  });
  return existing !== null;
}

/**
 * Marks an event as processed with handler results.
 */
async function markEventProcessed(
  prisma: PrismaClient,
  eventId: string,
  eventType: string,
  tenantId: string,
  results: EventHandlerResult[],
): Promise<void> {
  await prisma.health3ProcessedEvent.create({
    data: {
      eventId,
      eventType,
      tenantId,
      handlerResults: results as any,
    },
  });
}

// ---------------------------------------------------------------------------
// Event Processing
// ---------------------------------------------------------------------------

/**
 * Processes a single clinical event through all registered handlers.
 *
 * Steps:
 * 1. Check idempotency — skip if already processed
 * 2. Look up handlers for event type
 * 3. Execute each handler with error isolation
 * 4. Mark event as processed
 *
 * CYRUS: Requires tenantId in event payload.
 * Fire-and-forget: Individual handler errors don't block other handlers.
 */
export async function processEvent(
  prisma: PrismaClient,
  event: ClinicalEvent & { eventId?: string },
  tenantId: string,
): Promise<EventHandlerResult[]> {
  const eventId = (event as any).eventId ??
    `${event.type}:${Date.now()}:${Math.random().toString(36).slice(2)}`;

  // Idempotency check
  if (await isEventProcessed(prisma, eventId)) {
    return [{
      handlerName: 'orchestrator',
      processed: false,
      actions: ['SKIPPED: Event already processed'],
    }];
  }

  const handlers = handlerRegistry.get(event.type) ?? [];
  if (handlers.length === 0) {
    return [{
      handlerName: 'orchestrator',
      processed: false,
      actions: [`NO_HANDLERS: No handlers registered for ${event.type}`],
    }];
  }

  const context: HandlerContext = {
    prisma,
    tenantId,
    eventId,
  };

  const results: EventHandlerResult[] = [];

  for (const handler of handlers) {
    try {
      const result = await handler(event, context);
      results.push(result);
    } catch (err) {
      results.push({
        handlerName: 'unknown',
        processed: false,
        actions: [],
        errors: [(err as Error).message],
      });
    }
  }

  // Mark as processed for idempotency
  await markEventProcessed(prisma, eventId, event.type, tenantId, results).catch(() => {});

  return results;
}
