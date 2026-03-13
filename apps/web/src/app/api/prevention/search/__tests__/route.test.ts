import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    preventionPlan: { findMany: jest.fn() },
    preventionPlanTemplate: { findMany: jest.fn() },
    preventiveCareReminder: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

describe('GET /api/prevention/search', () => {
  beforeEach(() => jest.clearAllMocks());

  it('searches across plans, templates, and reminders', async () => {
    const now = new Date();

    (prisma.preventionPlan.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'plan-1',
        planName: 'CV Plan',
        description: 'Cardiovascular',
        planType: 'CARDIOVASCULAR',
        status: 'ACTIVE',
        goals: [],
        recommendations: [],
        guidelineSource: 'AHA',
        evidenceLevel: 'A',
        createdAt: now,
        updatedAt: now,
        patient: { firstName: 'Maria', lastName: 'Silva' },
      },
    ]);

    (prisma.preventionPlanTemplate.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'tmpl-1',
        templateName: 'CV Template',
        description: 'Template',
        planType: 'CARDIOVASCULAR',
        isActive: true,
        useCount: 5,
        lastUsedAt: now,
        goals: [],
        recommendations: [],
        guidelineSource: 'AHA',
        evidenceLevel: 'A',
        createdAt: now,
        updatedAt: now,
      },
    ]);

    (prisma.preventiveCareReminder.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'rem-1',
        title: 'Blood pressure check',
        description: 'Annual screening',
        status: 'PENDING',
        screeningType: 'BP',
        dueDate: now,
        priority: 'HIGH',
        guidelineSource: 'AHA',
        evidenceLevel: 'A',
        createdAt: now,
        updatedAt: now,
        patient: { firstName: 'Maria', lastName: 'Silva' },
      },
    ]);

    const res = await GET(new NextRequest('http://localhost:3000/api/prevention/search?q=blood'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.stats.totalResults).toBe(3);
    expect(data.data.stats.byType.plans).toBe(1);
    expect(data.data.stats.byType.templates).toBe(1);
    expect(data.data.stats.byType.reminders).toBe(1);
  });

  it('filters by type=plan', async () => {
    (prisma.preventionPlan.findMany as jest.Mock).mockResolvedValue([]);

    const res = await GET(new NextRequest('http://localhost:3000/api/prevention/search?type=plan'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(prisma.preventionPlan.findMany).toHaveBeenCalled();
    expect(prisma.preventionPlanTemplate.findMany).not.toHaveBeenCalled();
    expect(prisma.preventiveCareReminder.findMany).not.toHaveBeenCalled();
  });

  it('returns empty results for no matches', async () => {
    (prisma.preventionPlan.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.preventionPlanTemplate.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.preventiveCareReminder.findMany as jest.Mock).mockResolvedValue([]);

    const res = await GET(new NextRequest('http://localhost:3000/api/prevention/search?q=nonexistent'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.stats.totalResults).toBe(0);
  });

  it('applies date range filters', async () => {
    (prisma.preventionPlan.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.preventionPlanTemplate.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.preventiveCareReminder.findMany as jest.Mock).mockResolvedValue([]);

    await GET(new NextRequest('http://localhost:3000/api/prevention/search?startDate=2025-01-01&endDate=2025-12-31'));

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
