jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import {
  processEvent,
  registerHandler,
  clearHandlerRegistry,
  isEventProcessed,
} from '../orchestrator';
import type { EventHandlerResult, HandlerContext } from '../types';
import type { ClinicalEvent } from '@holi/event-bus';

// ---------------------------------------------------------------------------
// Mock Prisma
// ---------------------------------------------------------------------------

function makeMockPrisma() {
  return {
    health3ProcessedEvent: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ eventId: 'test-event' }),
    },
  } as any;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('orchestrator', () => {
  beforeEach(() => {
    clearHandlerRegistry();
  });

  describe('registerHandler + processEvent', () => {
    it('routes event to registered handler', async () => {
      const handler = jest.fn().mockResolvedValue({
        handlerName: 'test',
        processed: true,
        actions: ['did-something'],
      } satisfies EventHandlerResult);

      registerHandler(['encounter.completed'], handler);

      const prisma = makeMockPrisma();
      const event: ClinicalEvent = {
        type: 'encounter.completed',
        payload: {
          patientId: 'p-1',
          noteId: 'note-1',
          tenantId: 't-1',
          encounterId: 'enc-1',
        },
      };

      const results = await processEvent(prisma, { ...event, eventId: 'evt-1' } as any, 't-1');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(results[0].processed).toBe(true);
      expect(results[0].actions).toContain('did-something');
    });

    it('returns NO_HANDLERS for unregistered event type', async () => {
      const prisma = makeMockPrisma();
      const event: ClinicalEvent = {
        type: 'record.ingested',
        payload: {
          ingestId: 'ing-1',
          recordType: 'LAB_RESULT',
          tenantId: 't-1',
          sourceId: 'src-1',
          isValid: true,
          completenessScore: 1,
        },
      };

      const results = await processEvent(prisma, event as any, 't-1');
      expect(results[0].actions[0]).toContain('NO_HANDLERS');
    });

    it('executes multiple handlers for same event type', async () => {
      const handler1 = jest.fn().mockResolvedValue({
        handlerName: 'handler1', processed: true, actions: ['h1'],
      });
      const handler2 = jest.fn().mockResolvedValue({
        handlerName: 'handler2', processed: true, actions: ['h2'],
      });

      registerHandler(['encounter.completed'], handler1);
      registerHandler(['encounter.completed'], handler2);

      const prisma = makeMockPrisma();
      const event = {
        type: 'encounter.completed' as const,
        payload: { patientId: 'p-1', noteId: 'n-1', tenantId: 't-1', encounterId: 'enc-1' },
        eventId: 'evt-2',
      };

      const results = await processEvent(prisma, event as any, 't-1');
      expect(results).toHaveLength(2);
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('isolates handler errors — other handlers still execute', async () => {
      const failHandler = jest.fn().mockRejectedValue(new Error('boom'));
      const successHandler = jest.fn().mockResolvedValue({
        handlerName: 'success', processed: true, actions: ['ok'],
      });

      registerHandler(['encounter.completed'], failHandler);
      registerHandler(['encounter.completed'], successHandler);

      const prisma = makeMockPrisma();
      const event = {
        type: 'encounter.completed' as const,
        payload: { patientId: 'p-1', noteId: 'n-1', tenantId: 't-1', encounterId: 'enc-1' },
        eventId: 'evt-3',
      };

      const results = await processEvent(prisma, event as any, 't-1');
      expect(results).toHaveLength(2);
      expect(results[0].errors).toContain('boom');
      expect(results[1].processed).toBe(true);
    });
  });

  describe('idempotency', () => {
    it('skips already-processed events', async () => {
      const handler = jest.fn();
      registerHandler(['encounter.completed'], handler);

      const prisma = makeMockPrisma();
      (prisma.health3ProcessedEvent.findUnique as jest.Mock).mockResolvedValue({
        eventId: 'evt-existing',
      });

      const event = {
        type: 'encounter.completed' as const,
        payload: { patientId: 'p-1', noteId: 'n-1', tenantId: 't-1', encounterId: 'enc-1' },
        eventId: 'evt-existing',
      };

      const results = await processEvent(prisma, event as any, 't-1');
      expect(handler).not.toHaveBeenCalled();
      expect(results[0].actions[0]).toContain('SKIPPED');
    });

    it('marks event as processed after handling', async () => {
      const handler = jest.fn().mockResolvedValue({
        handlerName: 'test', processed: true, actions: ['ok'],
      });
      registerHandler(['encounter.completed'], handler);

      const prisma = makeMockPrisma();
      const event = {
        type: 'encounter.completed' as const,
        payload: { patientId: 'p-1', noteId: 'n-1', tenantId: 't-1', encounterId: 'enc-1' },
        eventId: 'evt-4',
      };

      await processEvent(prisma, event as any, 't-1');
      expect(prisma.health3ProcessedEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventId: 'evt-4',
            eventType: 'encounter.completed',
          }),
        }),
      );
    });
  });

  describe('isEventProcessed', () => {
    it('returns false for unprocessed events', async () => {
      const prisma = makeMockPrisma();
      const result = await isEventProcessed(prisma, 'new-event');
      expect(result).toBe(false);
    });

    it('returns true for processed events', async () => {
      const prisma = makeMockPrisma();
      (prisma.health3ProcessedEvent.findUnique as jest.Mock).mockResolvedValue({
        eventId: 'old-event',
      });
      const result = await isEventProcessed(prisma, 'old-event');
      expect(result).toBe(true);
    });
  });
});
