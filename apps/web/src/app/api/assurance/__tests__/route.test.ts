import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    assuranceEvent: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    humanFeedback: { deleteMany: jest.fn() },
    outcomeGroundTruth: { deleteMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/services/assurance-capture.service', () => ({
  assuranceCaptureService: {
    captureAIEvent: jest.fn(),
    recordHumanDecision: jest.fn(),
  },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { POST, GET, DELETE, PATCH } = require('../route');
const { prisma } = require('@/lib/prisma');
const { assuranceCaptureService } = require('@/services/assurance-capture.service');

const validCaptureBody = {
  patientId: 'p-1',
  eventType: 'DIAGNOSIS',
  clinicId: 'clinic-1',
  inputContextSnapshot: { chiefComplaint: 'chest pain' },
  aiRecommendation: { code: 'I10', label: 'Hypertension' },
  aiConfidence: 0.92,
  aiProvider: 'gpt-4',
};

describe('POST /api/assurance', () => {
  beforeEach(() => jest.clearAllMocks());

  it('captures an assurance event', async () => {
    (assuranceCaptureService.captureAIEvent as jest.Mock).mockResolvedValue({
      eventId: 'ev-1',
      patientIdHash: 'hash-1',
      inputHash: 'ihash-1',
    });

    const req = new NextRequest('http://localhost:3000/api/assurance', {
      method: 'POST',
      body: JSON.stringify(validCaptureBody),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.eventId).toBe('ev-1');
  });

  it('returns 400 for invalid input', async () => {
    const req = new NextRequest('http://localhost:3000/api/assurance', {
      method: 'POST',
      body: JSON.stringify({ patientId: '' }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Validation');
  });

  it('returns 500 on service failure', async () => {
    (assuranceCaptureService.captureAIEvent as jest.Mock).mockRejectedValue(new Error('Service down'));

    const req = new NextRequest('http://localhost:3000/api/assurance', {
      method: 'POST',
      body: JSON.stringify(validCaptureBody),
    });

    const res = await POST(req);

    expect(res.status).toBe(500);
  });
});

describe('GET /api/assurance', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists assurance events with pagination', async () => {
    const mockEvents = [{ id: 'ev-1', eventType: 'DIAGNOSIS', feedback: [], outcome: null }];
    (prisma.assuranceEvent.findMany as jest.Mock).mockResolvedValue(mockEvents);
    (prisma.assuranceEvent.count as jest.Mock).mockResolvedValue(1);

    const req = new NextRequest('http://localhost:3000/api/assurance?limit=10&offset=0');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.pagination.total).toBe(1);
  });

  it('filters by clinicId and eventType', async () => {
    (prisma.assuranceEvent.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.assuranceEvent.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost:3000/api/assurance?clinicId=c-1&eventType=BILLING');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(prisma.assuranceEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clinicId: 'c-1', eventType: 'BILLING' }),
      })
    );
  });

  it('returns 500 on database error', async () => {
    (prisma.assuranceEvent.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost:3000/api/assurance');
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});

describe('DELETE /api/assurance', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes an assurance event with cascade', async () => {
    (prisma.assuranceEvent.findUnique as jest.Mock).mockResolvedValue({
      id: 'ev-1',
      feedback: [{ id: 'f-1' }],
      outcome: { id: 'o-1' },
    });
    (prisma.$transaction as jest.Mock).mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost:3000/api/assurance?id=ev-1&hard=true');
    const res = await DELETE(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.deletedRelations.feedback).toBe(1);
  });

  it('returns 400 without event ID', async () => {
    const req = new NextRequest('http://localhost:3000/api/assurance');
    const res = await DELETE(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Event ID required');
  });

  it('returns 404 when event not found', async () => {
    (prisma.assuranceEvent.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/assurance?id=ev-missing');
    const res = await DELETE(req);

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/assurance', () => {
  beforeEach(() => jest.clearAllMocks());

  it('records a human decision on an event', async () => {
    (prisma.assuranceEvent.findUnique as jest.Mock).mockResolvedValue({ id: 'ev-1', decidedAt: null });
    (assuranceCaptureService.recordHumanDecision as jest.Mock).mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost:3000/api/assurance', {
      method: 'PATCH',
      body: JSON.stringify({ eventId: 'ev-1', decision: { code: 'I10' }, override: false }),
    });

    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.override).toBe(false);
  });

  it('returns 409 if decision already recorded', async () => {
    (prisma.assuranceEvent.findUnique as jest.Mock).mockResolvedValue({ id: 'ev-1', decidedAt: new Date() });

    const req = new NextRequest('http://localhost:3000/api/assurance', {
      method: 'PATCH',
      body: JSON.stringify({ eventId: 'ev-1', decision: {}, override: false }),
    });

    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toContain('already recorded');
  });

  it('returns 404 when event not found', async () => {
    (prisma.assuranceEvent.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/assurance', {
      method: 'PATCH',
      body: JSON.stringify({ eventId: 'ev-missing', decision: {}, override: false }),
    });

    const res = await PATCH(req);

    expect(res.status).toBe(404);
  });
});
