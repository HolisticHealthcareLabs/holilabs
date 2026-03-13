import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    preventionPlan: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

describe('GET /api/prevention/analytics', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns comprehensive analytics', async () => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    (prisma.preventionPlan.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'p-1',
        status: 'ACTIVE',
        planType: 'CARDIOVASCULAR',
        goals: [
          { goal: 'BP check', category: 'screening', status: 'COMPLETED' },
          { goal: 'Lipid panel', category: 'lab', status: 'PENDING' },
        ],
        createdAt: weekAgo,
        activatedAt: weekAgo,
        completedAt: null,
        deactivatedAt: null,
        completionReason: null,
        deactivationReason: null,
      },
      {
        id: 'p-2',
        status: 'COMPLETED',
        planType: 'DIABETES',
        goals: [
          { goal: 'HbA1c test', category: 'lab', status: 'COMPLETED' },
        ],
        createdAt: now,
        activatedAt: weekAgo,
        completedAt: now,
        deactivatedAt: null,
        completionReason: 'Goals met',
        deactivationReason: null,
      },
    ]);

    const res = await GET(new NextRequest('http://localhost:3000/api/prevention/analytics'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.overview.totalPlans).toBe(2);
    expect(data.data.overview.activePlans).toBe(1);
    expect(data.data.overview.completedPlans).toBe(1);
    expect(data.data.overview.totalGoals).toBe(3);
    expect(data.data.overview.completedGoals).toBe(2);
    expect(data.data.plansByType).toHaveProperty('CARDIOVASCULAR');
    expect(data.data.plansByType).toHaveProperty('DIABETES');
  });

  it('returns empty analytics when no plans exist', async () => {
    (prisma.preventionPlan.findMany as jest.Mock).mockResolvedValue([]);

    const res = await GET(new NextRequest('http://localhost:3000/api/prevention/analytics'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.overview.totalPlans).toBe(0);
    expect(data.data.overview.completionRate).toBe(0);
  });

  it('filters by patientId', async () => {
    (prisma.preventionPlan.findMany as jest.Mock).mockResolvedValue([]);

    await GET(new NextRequest('http://localhost:3000/api/prevention/analytics?patientId=p-1'));

    expect(prisma.preventionPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ patientId: 'p-1' }),
      })
    );
  });

  it('filters by date range', async () => {
    (prisma.preventionPlan.findMany as jest.Mock).mockResolvedValue([]);

    await GET(new NextRequest('http://localhost:3000/api/prevention/analytics?startDate=2025-01-01&endDate=2025-12-31'));

    expect(prisma.preventionPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      })
    );
  });
});
