import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    preventionPlan: { findUnique: jest.fn(), update: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { PATCH, GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'doc-1', email: 'doc@test.com' },
  params: { planId: 'plan-1' },
};

const mockPlan = {
  id: 'plan-1',
  planName: 'Cardiovascular Prevention',
  status: 'ACTIVE',
  statusChanges: [],
  createdAt: new Date(),
  completedAt: null,
  deactivatedAt: null,
  completionReason: null,
  deactivationReason: null,
};

describe('PATCH /api/prevention/plans/[planId]/status', () => {
  beforeEach(() => jest.clearAllMocks());

  it('transitions plan to COMPLETED status', async () => {
    (prisma.preventionPlan.findUnique as jest.Mock).mockResolvedValue(mockPlan);
    (prisma.preventionPlan.update as jest.Mock).mockResolvedValue({
      ...mockPlan,
      status: 'COMPLETED',
    });

    const req = new NextRequest('http://localhost:3000/api/prevention/plans/plan-1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'COMPLETED', reason: 'All goals achieved' }),
    });
    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.status).toBe('COMPLETED');
    expect(data.data.previousStatus).toBe('ACTIVE');
    expect(data.message).toBe('Plan marked as completed');
  });

  it('returns 400 when plan is already in target status', async () => {
    (prisma.preventionPlan.findUnique as jest.Mock).mockResolvedValue(mockPlan);

    const req = new NextRequest('http://localhost:3000/api/prevention/plans/plan-1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'ACTIVE' }),
    });
    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('already ACTIVE');
  });

  it('returns 404 when plan not found', async () => {
    (prisma.preventionPlan.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/prevention/plans/missing/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid status value', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/plans/plan-1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'ARCHIVED' }),
    });
    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid request data');
  });
});

describe('GET /api/prevention/plans/[planId]/status', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns status change history for a plan', async () => {
    const planWithHistory = {
      ...mockPlan,
      statusChanges: [
        { timestamp: new Date().toISOString(), userId: 'doc-1', fromStatus: 'ACTIVE', toStatus: 'COMPLETED' },
      ],
    };
    (prisma.preventionPlan.findUnique as jest.Mock).mockResolvedValue(planWithHistory);

    const req = new NextRequest('http://localhost:3000/api/prevention/plans/plan-1/status');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.planId).toBe('plan-1');
    expect(data.data.statusHistory).toHaveLength(1);
  });

  it('returns 404 for missing plan on GET', async () => {
    (prisma.preventionPlan.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/prevention/plans/missing/status');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
  });
});
