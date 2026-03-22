/**
 * @holi/event-bus unit tests
 *
 * QUINN invariant: jest.mock() BEFORE require() — never ES6 import after mock.
 */

// ─── Mock ioredis BEFORE any imports ────────────────────────────────────────

const mockXadd = jest.fn();
const mockXread = jest.fn();
const mockPipeline = jest.fn();
const mockQuit = jest.fn();

const mockPipelineInstance = {
  xadd: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue([[null, '1-1'], [null, '2-1']]),
};

mockPipeline.mockReturnValue(mockPipelineInstance);

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    xadd: mockXadd,
    xread: mockXread,
    pipeline: mockPipeline,
    quit: mockQuit,
  }));
});

// ─── Import AFTER mock setup ─────────────────────────────────────────────────

import { EventPublisher } from '../publisher';
import { EventSubscriber } from '../subscriber';
import type {
  RecordIngestedEvent,
  RecordInvalidEvent,
  ComplaintRecordedEvent,
  FamilyHistoryUpdatedEvent,
  LaudoMedicoGeneratedEvent,
} from '../types';

// ─── Test helpers ────────────────────────────────────────────────────────────

function makeIngestedEvent(): RecordIngestedEvent {
  return {
    type: 'record.ingested',
    payload: {
      ingestId: 'ingest-001',
      recordType: 'LAB_RESULT',
      patientId: 'patient-123',
      tenantId: 'tenant-abc',
      sourceId: 'source-xyz',
      isValid: true,
      completenessScore: 0.95,
    },
  };
}

function makeInvalidEvent(): RecordInvalidEvent {
  return {
    type: 'record.invalid',
    payload: {
      ingestId: 'ingest-002',
      sourceId: 'source-xyz',
      tenantId: 'tenant-abc',
      errors: [{ code: 'INSUFFICIENT_DATA', field: 'value', message: 'Lab value is missing' }],
    },
  };
}

// ─── EventPublisher tests ────────────────────────────────────────────────────

describe('EventPublisher', () => {
  let publisher: EventPublisher;

  beforeEach(() => {
    jest.clearAllMocks();
    mockXadd.mockResolvedValue('1234567890-0');
    publisher = new EventPublisher({ redisUrl: 'redis://localhost:6379' });
  });

  it('publishes a record.ingested event to the correct stream key', async () => {
    const event = makeIngestedEvent();
    const messageId = await publisher.publish(event);

    expect(messageId).toBe('1234567890-0');
    expect(mockXadd).toHaveBeenCalledTimes(1);

    const [streamKey, ...rest] = mockXadd.mock.calls[0] as string[];
    expect(streamKey).toBe('clinical:record.ingested');
    expect(rest[0]).toBe('*'); // auto-generated ID

    // Verify the payload field contains valid JSON with the right data
    const payloadIndex = rest.indexOf('payload');
    expect(payloadIndex).toBeGreaterThan(-1);
    const payloadJson = rest[payloadIndex + 1] as string;
    const payload = JSON.parse(payloadJson);
    expect(payload.ingestId).toBe('ingest-001');
    expect(payload.tenantId).toBe('tenant-abc');
  });

  it('publishes a record.invalid event', async () => {
    const event = makeInvalidEvent();
    await publisher.publish(event);

    const [streamKey] = mockXadd.mock.calls[0] as string[];
    expect(streamKey).toBe('clinical:record.invalid');
  });

  it('publishes a prevention.gap.detected event', async () => {
    await publisher.publish({
      type: 'prevention.gap.detected',
      payload: {
        patientId: 'patient-123',
        rule: 'HbA1c_PREDIABETES',
        severity: 'HIGH',
        tenantId: 'tenant-abc',
        alertId: 'alert-001',
      },
    });

    const [streamKey] = mockXadd.mock.calls[0] as string[];
    expect(streamKey).toBe('clinical:prevention.gap.detected');
  });

  it('throws when XADD returns null', async () => {
    mockXadd.mockResolvedValue(null);
    const event = makeIngestedEvent();

    await expect(publisher.publish(event)).rejects.toThrow(
      /XADD to clinical:record.ingested returned null/
    );
  });

  it('publishBatch sends multiple events in a pipeline', async () => {
    const events = [makeIngestedEvent(), makeInvalidEvent()];
    const ids = await publisher.publishBatch(events);

    expect(mockPipelineInstance.xadd).toHaveBeenCalledTimes(2);
    expect(ids).toHaveLength(2);
  });

  it('disconnects cleanly', async () => {
    mockQuit.mockResolvedValue('OK');
    await publisher.disconnect();
    expect(mockQuit).toHaveBeenCalledTimes(1);
  });

  it('publishes a complaint.recorded event', async () => {
    const event: ComplaintRecordedEvent = {
      type: 'complaint.recorded',
      payload: {
        complaintId: 'complaint-001',
        encounterId: 'encounter-001',
        patientId: 'patient-123',
        tenantId: 'tenant-abc',
        icdCode: 'R10.4',
      },
    };
    await publisher.publish(event);

    const [streamKey] = mockXadd.mock.calls[0] as string[];
    expect(streamKey).toBe('clinical:complaint.recorded');

    const payloadIndex = (mockXadd.mock.calls[0] as string[]).indexOf('payload');
    const payload = JSON.parse((mockXadd.mock.calls[0] as string[])[payloadIndex + 1]);
    expect(payload.complaintId).toBe('complaint-001');
    expect(payload.icdCode).toBe('R10.4');
  });

  it('publishes a family.history.updated event (CYRUS: no ICD codes)', async () => {
    const event: FamilyHistoryUpdatedEvent = {
      type: 'family.history.updated',
      payload: {
        patientId: 'patient-123',
        tenantId: 'tenant-abc',
        relationship: 'father',
        conditionCount: 2,
      },
    };
    await publisher.publish(event);

    const [streamKey] = mockXadd.mock.calls[0] as string[];
    expect(streamKey).toBe('clinical:family.history.updated');

    const payloadIndex = (mockXadd.mock.calls[0] as string[]).indexOf('payload');
    const payloadStr = (mockXadd.mock.calls[0] as string[])[payloadIndex + 1];
    const payload = JSON.parse(payloadStr);
    expect(payload.conditionCount).toBe(2);
    expect(payload).not.toHaveProperty('icdCode');
  });

  it('publishes a laudo.medico.generated event', async () => {
    const event: LaudoMedicoGeneratedEvent = {
      type: 'laudo.medico.generated',
      payload: {
        encounterId: 'encounter-001',
        patientId: 'patient-123',
        tenantId: 'tenant-abc',
        encounterType: 'anamnese_inicial',
        completenessScore: 0.82,
      },
    };
    await publisher.publish(event);

    const [streamKey] = mockXadd.mock.calls[0] as string[];
    expect(streamKey).toBe('clinical:laudo.medico.generated');

    const payloadIndex = (mockXadd.mock.calls[0] as string[]).indexOf('payload');
    const payload = JSON.parse((mockXadd.mock.calls[0] as string[])[payloadIndex + 1]);
    expect(payload.completenessScore).toBe(0.82);
    expect(payload.encounterType).toBe('anamnese_inicial');
  });

  it('CYRUS: envelope tenantId matches event payload tenantId', async () => {
    const event = makeIngestedEvent();
    await publisher.publish(event);

    const args = mockXadd.mock.calls[0] as string[];
    const tenantIdIndex = args.indexOf('tenantId');
    expect(tenantIdIndex).toBeGreaterThan(-1);
    expect(args[tenantIdIndex + 1]).toBe('tenant-abc');
  });
});

// ─── EventSubscriber tests ───────────────────────────────────────────────────

describe('EventSubscriber', () => {
  let subscriber: EventSubscriber;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuit.mockResolvedValue('OK');
    subscriber = new EventSubscriber({
      redisUrl: 'redis://localhost:6379',
      blockMs: 0,
    });
  });

  it('dispatches events to registered handlers', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    subscriber.subscribe('record.ingested', handler);

    const mockStreamResult = [
      {
        name: 'clinical:record.ingested',
        messages: [
          {
            id: '1234567890-0',
            message: {
              eventId: 'evt-001',
              type: 'record.ingested',
              tenantId: 'tenant-abc',
              timestamp: new Date().toISOString(),
              version: '1',
              payload: JSON.stringify(makeIngestedEvent().payload),
            },
          },
        ],
      },
    ];

    mockXread.mockResolvedValueOnce(mockStreamResult);

    await subscriber.poll();

    expect(handler).toHaveBeenCalledTimes(1);
    const envelope = handler.mock.calls[0][0];
    expect(envelope.type).toBe('record.ingested');
    expect(envelope.tenantId).toBe('tenant-abc');
    expect(envelope.payload.ingestId).toBe('ingest-001');
  });

  it('handles null XREAD response gracefully (no messages)', async () => {
    const handler = jest.fn();
    subscriber.subscribe('record.ingested', handler);

    mockXread.mockResolvedValueOnce(null);
    await subscriber.poll();

    expect(handler).not.toHaveBeenCalled();
  });

  it('isolates handler errors — does not stop processing other events', async () => {
    const failingHandler = jest.fn().mockRejectedValue(new Error('Handler crashed'));
    const successHandler = jest.fn().mockResolvedValue(undefined);

    subscriber.subscribe('record.ingested', failingHandler);
    subscriber.subscribe('record.ingested', successHandler);

    const mockStreamResult = [
      {
        name: 'clinical:record.ingested',
        messages: [
          {
            id: '1-0',
            message: {
              eventId: 'evt-002',
              type: 'record.ingested',
              tenantId: 'tenant-abc',
              timestamp: new Date().toISOString(),
              version: '1',
              payload: JSON.stringify(makeIngestedEvent().payload),
            },
          },
        ],
      },
    ];

    mockXread.mockResolvedValueOnce(mockStreamResult);
    // Should not throw even though failingHandler throws
    await expect(subscriber.poll()).resolves.not.toThrow();
    expect(successHandler).toHaveBeenCalledTimes(1);
  });

  it('skips malformed message payloads without crashing', async () => {
    const handler = jest.fn();
    subscriber.subscribe('record.ingested', handler);

    const mockStreamResult = [
      {
        name: 'clinical:record.ingested',
        messages: [
          {
            id: '1-0',
            message: {
              type: 'record.ingested',
              payload: 'NOT_VALID_JSON{{{',
            },
          },
        ],
      },
    ];

    mockXread.mockResolvedValueOnce(mockStreamResult);
    await expect(subscriber.poll()).resolves.not.toThrow();
    expect(handler).not.toHaveBeenCalled();
  });
});
