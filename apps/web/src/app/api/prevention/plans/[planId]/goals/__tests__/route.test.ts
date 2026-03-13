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

const { PATCH, POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'doc-1', email: 'doc@test.com' },
  params: { planId: 'plan-1' },
};

const mockPlan = {
  id: 'plan-1',
  status: 'ACTIVE',
  goals: [
    { goal: 'Exercise 30 min/day', status: 'PENDING' },
    { goal: 'Reduce sodium intake', status: 'PENDING' },
  ],
};

describe('PATCH /api/prevention/plans/[planId]/goals', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates goal status successfully', async () => {
    (prisma.preventionPlan.findUnique as jest.Mock).mockResolvedValue(mockPlan);
    (prisma.preventionPlan.update as jest.Mock).mockResolvedValue({
      ...mockPlan,
      goals: [
        { goal: 'Exercise 30 min/day', status: 'COMPLETED' },
        { goal: 'Reduce sodium intake', status: 'PENDING' },
      ],
    });

    const req = new NextRequest('http://localhost:3000/api/prevention/plans/plan-1/goals', {
      method: 'PATCH',
      body: JSON.stringify({ goalIndex: 0, updates: { status: 'COMPLETED' } }),
    });
    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.goalIndex).toBe(0);
    expect(data.data.planId).toBe('plan-1');
  });

  it('returns 404 when plan not found', async () => {
    (prisma.preventionPlan.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/prevention/plans/missing/goals', {
      method: 'PATCH',
      body: JSON.stringify({ goalIndex: 0, updates: { status: 'COMPLETED' } }),
    });
    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Prevention plan not found');
  });

  it('returns 400 for invalid goalIndex', async () => {
    (prisma.preventionPlan.findUnique as jest.Mock).mockResolvedValue(mockPlan);

    const req = new NextRequest('http://localhost:3000/api/prevention/plans/plan-1/goals', {
      method: 'PATCH',
      body: JSON.stringify({ goalIndex: 99, updates: { status: 'COMPLETED' } }),
    });
    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid goal index');
  });

  it('returns 400 for invalid request schema', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/plans/plan-1/goals', {
      method: 'PATCH',
      body: JSON.stringify({ goalIndex: 'not-a-number', updates: {} }),
    });
    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid request data');
  });
});

describe('POST /api/prevention/plans/[planId]/goals (bulk)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('bulk updates multiple goals to same status', async () => {
    (prisma.preventionPlan.findUnique as jest.Mock).mockResolvedValue(mockPlan);
    (prisma.preventionPlan.update as jest.Mock).mockResolvedValue({
      ...mockPlan,
      goals: [
        { goal: 'Exercise 30 min/day', status: 'COMPLETED' },
        { goal: 'Reduce sodium intake', status: 'COMPLETED' },
      ],
    });

    const req = new NextRequest('http://localhost:3000/api/prevention/plans/plan-1/goals', {
      method: 'POST',
      body: JSON.stringify({ goalIndices: [0, 1], status: 'COMPLETED' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.updatedCount).toBe(2);
    expect(data.data.allGoalsCompleted).toBe(true);
  });

  it('returns 400 when goalIndices is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/plans/plan-1/goals', {
      method: 'POST',
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
  });
});
