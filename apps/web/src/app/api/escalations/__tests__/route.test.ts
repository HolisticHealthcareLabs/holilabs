import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    escalation: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

describe('GET /api/escalations', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns escalations with counts', async () => {
    (prisma.escalation.findMany as jest.Mock).mockResolvedValue([
      { id: 'esc-1', status: 'OPEN', slaDeadline: new Date(), patient: { id: 'p-1' } },
    ]);
    (prisma.escalation.count as jest.Mock)
      .mockResolvedValueOnce(1)  // total
      .mockResolvedValueOnce(3)  // open
      .mockResolvedValueOnce(1)  // breached
      .mockResolvedValueOnce(5); // resolved

    const req = new NextRequest('http://localhost:3000/api/escalations');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.counts.open).toBe(3);
    expect(data.counts.breached).toBe(1);
    expect(data.counts.resolved).toBe(5);
  });

  it('filters by status', async () => {
    (prisma.escalation.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.escalation.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost:3000/api/escalations?status=BREACHED');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(prisma.escalation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'BREACHED' },
      })
    );
  });

  it('respects limit and offset pagination', async () => {
    (prisma.escalation.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.escalation.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost:3000/api/escalations?limit=10&offset=20');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(prisma.escalation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, skip: 20 })
    );
  });

  it('caps limit at 100', async () => {
    (prisma.escalation.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.escalation.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost:3000/api/escalations?limit=500');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(prisma.escalation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 })
    );
  });
});
