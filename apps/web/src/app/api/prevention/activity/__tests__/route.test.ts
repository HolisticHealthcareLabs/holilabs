import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    preventionPlan: { findMany: jest.fn() },
    preventionPlanTemplate: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

describe('GET /api/prevention/activity', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns combined activity feed sorted by timestamp', async () => {
    const now = new Date();
    const earlier = new Date(now.getTime() - 60000);

    (prisma.preventionPlan.findMany as jest.Mock)
      .mockResolvedValueOnce([
        {
          id: 'plan-1',
          planName: 'CV Plan',
          planType: 'CARDIOVASCULAR',
          status: 'ACTIVE',
          createdAt: now,
          patient: { firstName: 'Maria', lastName: 'Silva' },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'plan-1',
          planName: 'CV Plan',
          statusChanges: [
            { fromStatus: null, toStatus: 'ACTIVE', timestamp: earlier.toISOString(), userId: 'doc-1' },
          ],
          updatedAt: earlier,
          patient: { firstName: 'Maria', lastName: 'Silva' },
        },
      ]);

    (prisma.preventionPlanTemplate.findMany as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'tmpl-1',
          templateName: 'Template A',
          planType: 'COMPREHENSIVE',
          isActive: true,
          createdBy: 'doc-1',
          createdAt: earlier,
        },
      ]);

    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: 'doc-1', firstName: 'Dr', lastName: 'Test' },
    ]);

    const res = await GET(new NextRequest('http://localhost:3000/api/prevention/activity'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.activities.length).toBeGreaterThan(0);
    expect(data.data.total).toBeGreaterThan(0);
  });

  it('returns empty activity feed', async () => {
    (prisma.preventionPlan.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.preventionPlanTemplate.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

    const res = await GET(new NextRequest('http://localhost:3000/api/prevention/activity'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.activities).toEqual([]);
  });

  it('respects limit and offset params', async () => {
    (prisma.preventionPlan.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.preventionPlanTemplate.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

    await GET(new NextRequest('http://localhost:3000/api/prevention/activity?limit=10&offset=5'));

    expect(prisma.preventionPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, skip: 5 })
    );
  });
});
