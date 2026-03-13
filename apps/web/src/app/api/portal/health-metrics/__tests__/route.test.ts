import { NextRequest } from 'next/server';

jest.mock('@/lib/api/patient-portal-middleware', () => ({
  createPatientPortalRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    healthMetric: { findMany: jest.fn(), create: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  session: { userId: 'pu-1', patientId: 'patient-1', email: 'patient@example.com' },
  requestId: 'req-1',
};

const mockMetric = {
  id: 'metric-1',
  patientId: 'patient-1',
  metricType: 'WEIGHT',
  value: 70,
  unit: 'kg',
  recordedAt: new Date(),
};

describe('GET /api/portal/health-metrics', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns grouped metrics', async () => {
    (prisma.healthMetric.findMany as jest.Mock).mockResolvedValue([mockMetric]);

    const res = await GET(new NextRequest('http://localhost:3000/api/portal/health-metrics'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.metrics).toHaveLength(1);
    expect(data.data.summary.total).toBe(1);
    expect(data.data.metricsByType.WEIGHT).toHaveLength(1);
  });

  it('filters by metricType', async () => {
    (prisma.healthMetric.findMany as jest.Mock).mockResolvedValue([]);

    await GET(
      new NextRequest('http://localhost:3000/api/portal/health-metrics?metricType=GLUCOSE'),
      mockContext
    );

    expect(prisma.healthMetric.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ metricType: 'GLUCOSE' }),
      })
    );
  });

  it('returns empty when no metrics', async () => {
    (prisma.healthMetric.findMany as jest.Mock).mockResolvedValue([]);

    const res = await GET(new NextRequest('http://localhost:3000/api/portal/health-metrics'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.summary.total).toBe(0);
  });
});

describe('POST /api/portal/health-metrics', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a new metric', async () => {
    (prisma.healthMetric.create as jest.Mock).mockResolvedValue({ ...mockMetric, id: 'metric-new' });
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/portal/health-metrics', {
      method: 'POST',
      body: JSON.stringify({ metricType: 'WEIGHT', value: 70, unit: 'kg' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(prisma.healthMetric.create).toHaveBeenCalled();
  });

  it('returns 400 for invalid data', async () => {
    const req = new NextRequest('http://localhost:3000/api/portal/health-metrics', {
      method: 'POST',
      body: JSON.stringify({ metricType: 'INVALID', value: 'not-a-number', unit: 'kg' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });
});
