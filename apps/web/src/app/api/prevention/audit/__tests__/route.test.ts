import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    user: { findMany: jest.fn() },
    preventionPlan: { findMany: jest.fn() },
    preventionPlanTemplate: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

describe('GET /api/prevention/audit', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns audit logs with default filters', async () => {
    const mockLogs = [
      { id: 'log-1', userId: 'u-1', resource: 'prevention_plan', resourceId: 'p-1', action: 'CREATE', timestamp: new Date() },
    ];
    (prisma.auditLog.findMany as jest.Mock).mockResolvedValue(mockLogs);
    (prisma.auditLog.count as jest.Mock).mockResolvedValue(1);
    (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 'u-1', firstName: 'Dr', lastName: 'Smith', email: 'dr@test.com' }]);
    (prisma.preventionPlan.findMany as jest.Mock).mockResolvedValue([{ id: 'p-1', planName: 'CV Plan' }]);
    (prisma.preventionPlanTemplate.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.auditLog.groupBy as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost:3000/api/prevention/audit');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.logs).toHaveLength(1);
    expect(data.data.pagination.total).toBe(1);
  });

  it('filters by action and resource', async () => {
    (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.auditLog.count as jest.Mock).mockResolvedValue(0);
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.auditLog.groupBy as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost:3000/api/prevention/audit?action=CREATE&resource=prevention_plan');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ action: 'CREATE', resource: 'prevention_plan' }),
      })
    );
  });

  it('applies date range filtering', async () => {
    (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.auditLog.count as jest.Mock).mockResolvedValue(0);
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.auditLog.groupBy as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost:3000/api/prevention/audit?startDate=2024-01-01&endDate=2024-12-31');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          timestamp: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      })
    );
  });

  it('returns 500 on database error', async () => {
    (prisma.auditLog.findMany as jest.Mock).mockRejectedValue(new Error('DB down'));

    const req = new NextRequest('http://localhost:3000/api/prevention/audit');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toContain('Failed to fetch audit logs');
  });
});
