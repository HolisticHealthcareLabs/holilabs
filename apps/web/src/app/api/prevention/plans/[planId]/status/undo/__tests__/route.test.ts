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

const { POST, GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'doc-1', email: 'doc@test.com' },
  params: { planId: 'plan-1' },
};

const recentTimestamp = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour ago
const oldTimestamp = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25 hours ago

const mockPlanWithHistory = {
  id: 'plan-1',
  status: 'COMPLETED',
  statusChanges: [
    { timestamp: recentTimestamp, userId: 'doc-1', fromStatus: 'ACTIVE', toStatus: 'COMPLETED', reason: 'goals_met' },
  ],
};

describe('POST /api/prevention/plans/[planId]/status/undo', () => {
  beforeEach(() => jest.clearAllMocks());

  it('undoes last status change within 24 hours', async () => {
    (prisma.preventionPlan.findUnique as jest.Mock).mockResolvedValue(mockPlanWithHistory);
    (prisma.preventionPlan.update as jest.Mock).mockResolvedValue({ id: 'plan-1', status: 'ACTIVE' });

    const req = new NextRequest('http://localhost:3000/api/prevention/plans/plan-1/status/undo', {
      method: 'POST',
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.restoredStatus).toBe('ACTIVE');
  });

  it('returns 404 when plan not found', async () => {
    (prisma.preventionPlan.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/prevention/plans/missing/status/undo', {
      method: 'POST',
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Prevention plan not found');
  });

  it('returns 400 when no status changes to undo', async () => {
    (prisma.preventionPlan.findUnique as jest.Mock).mockResolvedValue({
      ...mockPlanWithHistory,
      statusChanges: [],
    });

    const req = new NextRequest('http://localhost:3000/api/prevention/plans/plan-1/status/undo', {
      method: 'POST',
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('No status changes to undo');
  });

  it('returns 400 when change is older than 24 hours', async () => {
    (prisma.preventionPlan.findUnique as jest.Mock).mockResolvedValue({
      ...mockPlanWithHistory,
      statusChanges: [
        { timestamp: oldTimestamp, userId: 'doc-1', fromStatus: 'ACTIVE', toStatus: 'COMPLETED' },
      ],
    });

    const req = new NextRequest('http://localhost:3000/api/prevention/plans/plan-1/status/undo', {
      method: 'POST',
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Cannot undo status change');
  });
});

describe('GET /api/prevention/plans/[planId]/status/undo', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns canUndo true when last change is within 24 hours', async () => {
    (prisma.preventionPlan.findUnique as jest.Mock).mockResolvedValue(mockPlanWithHistory);

    const req = new NextRequest('http://localhost:3000/api/prevention/plans/plan-1/status/undo');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.canUndo).toBe(true);
  });

  it('returns canUndo false when no status history', async () => {
    (prisma.preventionPlan.findUnique as jest.Mock).mockResolvedValue({
      ...mockPlanWithHistory,
      statusChanges: [],
    });

    const req = new NextRequest('http://localhost:3000/api/prevention/plans/plan-1/status/undo');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.canUndo).toBe(false);
  });
});
