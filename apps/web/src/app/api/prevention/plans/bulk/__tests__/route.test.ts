import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    preventionPlan: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'doc-1', email: 'doc@test.com' },
};

const mockPlan = {
  id: 'plan-1',
  patientId: 'patient-1',
  planName: 'Cardiovascular Plan',
  planType: 'CARDIOVASCULAR',
  status: 'ACTIVE',
  statusChanges: [],
  description: 'Test plan',
  guidelineSource: 'AHA',
  evidenceLevel: 'A',
  goals: [],
  recommendations: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  activatedAt: new Date(),
  completedAt: null,
  deactivatedAt: null,
};

describe('POST /api/prevention/plans/bulk', () => {
  beforeEach(() => jest.clearAllMocks());

  it('bulk changes status of multiple plans', async () => {
    (prisma.preventionPlan.findUnique as jest.Mock).mockResolvedValue(mockPlan);
    (prisma.preventionPlan.update as jest.Mock).mockResolvedValue({ ...mockPlan, status: 'COMPLETED' });

    const req = new NextRequest('http://localhost:3000/api/prevention/plans/bulk', {
      method: 'POST',
      body: JSON.stringify({
        operation: 'status_change',
        planIds: ['plan-1'],
        params: { status: 'COMPLETED', reason: 'Batch close' },
      }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.successCount).toBe(1);
    expect(data.data.results[0].success).toBe(true);
  });

  it('returns 400 when operation or planIds are missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/plans/bulk', {
      method: 'POST',
      body: JSON.stringify({ operation: 'status_change' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('operation and planIds');
  });

  it('returns 400 for unknown operation', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/plans/bulk', {
      method: 'POST',
      body: JSON.stringify({ operation: 'archive_all', planIds: ['plan-1'] }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid operation');
  });

  it('soft-deletes plans on delete operation', async () => {
    (prisma.preventionPlan.findUnique as jest.Mock).mockResolvedValue(mockPlan);
    (prisma.preventionPlan.update as jest.Mock).mockResolvedValue({ ...mockPlan, status: 'DEACTIVATED' });

    const req = new NextRequest('http://localhost:3000/api/prevention/plans/bulk', {
      method: 'POST',
      body: JSON.stringify({ operation: 'delete', planIds: ['plan-1'] }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.results[0].data.status).toBe('DEACTIVATED');
  });
});
