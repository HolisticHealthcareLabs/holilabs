import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    manualReviewQueueItem: {
      groupBy: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    preventionPlan: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    preventiveCareReminder: {
      count: jest.fn(),
    },
    auditLog: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    humanFeedback: {
      groupBy: jest.fn(),
      count: jest.fn(),
    },
    assuranceEvent: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn(),
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');
const { safeErrorResponse } = require('@/lib/api/safe-error-response');

const ctx = { user: { id: 'admin-1', email: 'admin@holilabs.com', role: 'ADMIN' } };

beforeEach(() => {
  jest.clearAllMocks();
  (safeErrorResponse as jest.Mock).mockImplementation((_err: unknown, opts: any) =>
    new Response(JSON.stringify({ error: opts?.userMessage || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  );
  (prisma.manualReviewQueueItem.groupBy as jest.Mock).mockResolvedValue([
    { status: 'PENDING', _count: { id: 3 } },
    { status: 'IN_REVIEW', _count: { id: 1 } },
  ]);
  (prisma.manualReviewQueueItem.count as jest.Mock).mockResolvedValue(2);
  (prisma.manualReviewQueueItem.findMany as jest.Mock).mockResolvedValue([]);
  (prisma.preventionPlan.count as jest.Mock).mockResolvedValue(5);
  (prisma.preventionPlan.groupBy as jest.Mock).mockResolvedValue([
    { planType: 'CANCER_SCREENING', _count: { id: 5 } },
  ]);
  (prisma.preventiveCareReminder.count as jest.Mock).mockResolvedValue(4);
  (prisma.auditLog.count as jest.Mock).mockResolvedValue(10);
  (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);
  (prisma.humanFeedback.groupBy as jest.Mock).mockResolvedValue([]);
  (prisma.humanFeedback.count as jest.Mock).mockResolvedValue(0);
  (prisma.assuranceEvent.count as jest.Mock).mockResolvedValue(0);
  (prisma.assuranceEvent.groupBy as jest.Mock).mockResolvedValue([]);
});

describe('GET /api/clinical-command/summary', () => {
  it('returns aggregated clinical command center data', async () => {
    const req = new NextRequest('http://localhost:3000/api/clinical-command/summary');
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.reviewQueue.pending).toBe(3);
    expect(json.data.reviewQueue.inReview).toBe(1);
    expect(json.data.cdsAlerts).toBeDefined();
    expect(json.data.preventionGaps).toBeDefined();
    expect(json.data.governanceFeed).toBeDefined();
    expect(json.data.groundTruth).toBeDefined();
  });

  it('returns correct prevention gap counts', async () => {
    const req = new NextRequest('http://localhost:3000/api/clinical-command/summary');
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(json.data.preventionGaps.activePlans).toBe(5);
    expect(json.data.preventionGaps.byType.CANCER_SCREENING).toBe(5);
  });

  it('returns 500 via safeErrorResponse when prisma throws', async () => {
    (prisma.manualReviewQueueItem.groupBy as jest.Mock).mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost:3000/api/clinical-command/summary');
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBeDefined();
  });
});
