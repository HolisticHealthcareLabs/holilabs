import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { count: jest.fn() },
    appointment: { count: jest.fn() },
    auditLog: { count: jest.fn() },
    $queryRaw: jest.fn(),
  },
}));

jest.mock('@/lib/resilience/circuit-breaker', () => ({
  getAllCircuitBreakerStats: jest.fn(() => ({})),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  createLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() }),
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

describe('GET /api/health/metrics', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns all metric categories', async () => {
    (prisma.patient.count as jest.Mock).mockResolvedValue(100);
    (prisma.appointment.count as jest.Mock).mockResolvedValue(50);
    (prisma.auditLog.count as jest.Mock).mockResolvedValue(500);
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.system).toBeDefined();
    expect(data.system.uptime).toBeDefined();
    expect(data.system.memory).toBeDefined();
    expect(data.business).toBeDefined();
    expect(data.security).toBeDefined();
    expect(data.database).toBeDefined();
    expect(data.infrastructure).toBeDefined();
  });

  it('returns business metrics with patient counts', async () => {
    (prisma.patient.count as jest.Mock)
      .mockResolvedValueOnce(80)
      .mockResolvedValueOnce(100);
    (prisma.appointment.count as jest.Mock).mockResolvedValue(10);
    (prisma.auditLog.count as jest.Mock).mockResolvedValue(0);
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);

    const res = await GET();
    const data = await res.json();

    expect(data.business.patients.active).toBe(80);
    expect(data.business.patients.total).toBe(100);
  });

  it('handles database failure gracefully', async () => {
    (prisma.patient.count as jest.Mock).mockRejectedValue(new Error('DB error'));
    (prisma.appointment.count as jest.Mock).mockRejectedValue(new Error('DB error'));
    (prisma.auditLog.count as jest.Mock).mockRejectedValue(new Error('DB error'));
    (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('DB error'));

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.database.connected).toBe(false);
  });
});
