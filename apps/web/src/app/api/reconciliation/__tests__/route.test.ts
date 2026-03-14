import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    outcomeGroundTruth: { findMany: jest.fn(), count: jest.fn() },
    assuranceEvent: { findUnique: jest.fn() },
  },
}));

jest.mock('@/services/tiss-reconciliation.service', () => ({
  tissReconciliationService: {
    processBatch: jest.fn(),
    getStats: jest.fn(),
    manualLink: jest.fn(),
  },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { POST, GET, PATCH } = require('../route');
const { prisma } = require('@/lib/prisma');
const { tissReconciliationService } = require('@/services/tiss-reconciliation.service');

const mockContext = { user: { id: 'admin-1' } };

const validRecord = {
  insurerProtocol: 'PROT-001',
  insurerId: 'INS-001',
  tissCode: 'TISS-123',
  procedureDate: '2025-01-15',
  billingDate: '2025-01-20',
  isGlosa: false,
  billedAmount: 500,
};

describe('POST /api/reconciliation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('ingests TISS records and returns reconciliation results', async () => {
    (tissReconciliationService.processBatch as jest.Mock).mockResolvedValue([
      { tissProtocol: 'PROT-001', status: 'matched', matchScore: 0.98, eventId: 'event-1', candidates: [] },
    ]);

    const req = new NextRequest('http://localhost:3000/api/reconciliation', {
      method: 'POST',
      body: JSON.stringify({ records: [validRecord], source: 'UNIMED-SP' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.summary.total).toBe(1);
    expect(data.summary.matched).toBe(1);
  });

  it('returns 400 for invalid records (empty array)', async () => {
    const req = new NextRequest('http://localhost:3000/api/reconciliation', {
      method: 'POST',
      body: JSON.stringify({ records: [] }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Validation error');
  });

  it('returns 400 when records is missing insurerProtocol', async () => {
    const invalidRecord = { ...validRecord };
    delete (invalidRecord as any).insurerProtocol;

    const req = new NextRequest('http://localhost:3000/api/reconciliation', {
      method: 'POST',
      body: JSON.stringify({ records: [invalidRecord] }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
  });
});

describe('GET /api/reconciliation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns list of reconciliation outcomes', async () => {
    (prisma.outcomeGroundTruth.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.outcomeGroundTruth.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost:3000/api/reconciliation');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.pagination).toBeDefined();
  });

  it('returns stats when action=stats', async () => {
    (tissReconciliationService.getStats as jest.Mock).mockResolvedValue({ matchRate: 0.92, total: 100 });

    const req = new NextRequest(
      'http://localhost:3000/api/reconciliation?action=stats&clinicId=clinic-1&startDate=2025-01-01'
    );
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.matchRate).toBe(0.92);
  });
});

describe('PATCH /api/reconciliation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('manually links a TISS record to an event', async () => {
    (prisma.assuranceEvent.findUnique as jest.Mock).mockResolvedValue({ id: 'event-1', outcome: null });
    (tissReconciliationService.manualLink as jest.Mock).mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost:3000/api/reconciliation', {
      method: 'PATCH',
      body: JSON.stringify({ tissProtocol: 'PROT-001', eventId: 'event-1', record: validRecord }),
    });
    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.matchMethod).toBe('MANUAL');
  });

  it('returns 404 when event not found', async () => {
    (prisma.assuranceEvent.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/reconciliation', {
      method: 'PATCH',
      body: JSON.stringify({ tissProtocol: 'PROT-001', eventId: 'missing', record: validRecord }),
    });
    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Event not found');
  });

  it('returns 409 when event already has an outcome linked', async () => {
    (prisma.assuranceEvent.findUnique as jest.Mock).mockResolvedValue({ id: 'event-1', outcome: { id: 'outcome-1' } });

    const req = new NextRequest('http://localhost:3000/api/reconciliation', {
      method: 'PATCH',
      body: JSON.stringify({ tissProtocol: 'PROT-001', eventId: 'event-1', record: validRecord }),
    });
    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toContain('already has an outcome');
  });
});
