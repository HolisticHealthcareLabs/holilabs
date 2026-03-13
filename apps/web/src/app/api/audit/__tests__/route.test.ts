import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn(),
}));

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const ctx = { user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' } };

describe('GET /api/audit', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns paginated audit logs', async () => {
    (prisma.auditLog.count as jest.Mock).mockResolvedValue(100);
    (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([
      { id: 'log-1', action: 'READ', resource: 'Patient' },
      { id: 'log-2', action: 'UPDATE', resource: 'Patient' },
    ]);

    const req = new NextRequest('http://localhost:3000/api/audit?page=1&limit=50');
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(2);
    expect(json.pagination.total).toBe(100);
    expect(json.pagination.totalPages).toBe(2);
  });

  it('caps limit at 100', async () => {
    (prisma.auditLog.count as jest.Mock).mockResolvedValue(0);
    (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost:3000/api/audit?limit=500');
    await GET(req, ctx);

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 })
    );
  });

  it('filters by action and resource', async () => {
    (prisma.auditLog.count as jest.Mock).mockResolvedValue(5);
    (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost:3000/api/audit?action=READ&resource=Patient');
    await GET(req, ctx);

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          action: 'READ',
          resource: expect.objectContaining({ contains: 'Patient' }),
        }),
      })
    );
  });
});

describe('POST /api/audit', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates audit log entry', async () => {
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({ id: 'new-log' });

    const req = new NextRequest('http://localhost:3000/api/audit', {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.1' },
      body: JSON.stringify({
        action: 'EXPORT',
        resource: 'PatientData',
        resourceId: 'p1',
        details: { reason: 'compliance' },
      }),
    });
    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
  });
});
