import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  validateQuery: jest.fn(),
}));

jest.mock('@/lib/api/schemas', () => ({
  AnalyticsQuerySchema: {},
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { count: jest.fn() },
    appointment: { findMany: jest.fn(), groupBy: jest.fn() },
    prescription: { count: jest.fn(), groupBy: jest.fn() },
    clinicalNote: { count: jest.fn(), groupBy: jest.fn() },
    medication: { count: jest.fn(), groupBy: jest.fn() },
    consent: { findMany: jest.fn(), groupBy: jest.fn() },
  },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const ctx = {
  user: { id: 'admin-1', role: 'ADMIN' },
  validatedQuery: { metric: 'patient_count' },
};

describe('GET /api/analytics', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns patient count metrics', async () => {
    (prisma.patient.count as jest.Mock)
      .mockResolvedValueOnce(120)  // totalPatients
      .mockResolvedValueOnce(100)  // activePatients
      .mockResolvedValueOnce(80);  // previousPatients

    const req = new NextRequest('http://localhost:3000/api/analytics?metric=patient_count');
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.metric).toBe('patient_count');
    expect(json.data.total).toBe(120);
    expect(json.data.active).toBe(100);
  });

  it('returns 400 for invalid metric type', async () => {
    const invalidCtx = { ...ctx, validatedQuery: { metric: 'invalid_metric' } };
    const req = new NextRequest('http://localhost:3000/api/analytics?metric=invalid_metric');
    const res = await GET(req, invalidCtx);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Invalid metric type');
  });

  it('returns prescription metrics for prescriptions_today', async () => {
    const prescCtx = { ...ctx, validatedQuery: { metric: 'prescriptions_today' } };
    (prisma.prescription.count as jest.Mock).mockResolvedValue(15);
    (prisma.prescription.groupBy as jest.Mock).mockResolvedValue([
      { status: 'ACTIVE', _count: 10 },
      { status: 'PENDING', _count: 5 },
    ]);

    const req = new NextRequest('http://localhost:3000/api/analytics?metric=prescriptions_today');
    const res = await GET(req, prescCtx);
    const json = await res.json();

    expect(json.data.metric).toBe('prescriptions_today');
    expect(json.data.total).toBe(15);
  });
});
