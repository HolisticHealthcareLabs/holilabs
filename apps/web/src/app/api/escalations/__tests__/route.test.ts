import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    escalation: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'admin-1', email: 'admin@holilabs.com', role: 'ADMIN' },
};

describe('GET /api/escalations', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns escalations with pagination', async () => {
    (prisma.escalation.findMany as jest.Mock).mockResolvedValue([
      { id: 'esc-1', status: 'OPEN', slaDeadline: new Date(), patient: { id: 'p-1', firstName: 'Ana', lastName: 'Lima' } },
    ]);
    (prisma.escalation.count as jest.Mock).mockResolvedValue(1);

    const req = new NextRequest('http://localhost:3000/api/escalations');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.escalations).toHaveLength(1);
    expect(data.pagination.total).toBe(1);
  });

  it('filters by status', async () => {
    (prisma.escalation.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.escalation.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost:3000/api/escalations?status=BREACHED');
    const res = await GET(req, mockContext);

    expect(res.status).toBe(200);
    expect(prisma.escalation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'BREACHED' },
      })
    );
  });

  it('respects skip and take pagination', async () => {
    (prisma.escalation.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.escalation.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost:3000/api/escalations?take=10&skip=20');
    const res = await GET(req, mockContext);

    expect(res.status).toBe(200);
    expect(prisma.escalation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, skip: 20 })
    );
  });

  it('rejects take above 100 with validation error', async () => {
    const req = new NextRequest('http://localhost:3000/api/escalations?take=500');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Invalid query parameters');
    expect(prisma.escalation.findMany).not.toHaveBeenCalled();
  });
});
