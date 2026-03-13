import { NextRequest } from 'next/server';

jest.mock('@/lib/api/patient-portal-middleware', () => ({
  createPatientPortalRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    clinicalNote: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  session: { userId: 'pu-1', patientId: 'patient-1', email: 'p@test.com' },
  requestId: 'req-1',
};

describe('GET /api/portal/metrics', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns metrics summary with null values when no vital signs data exists', async () => {
    (prisma.clinicalNote.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost:3000/api/portal/metrics');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.metrics).toHaveLength(0);
    expect(data.data.summary.bloodPressure.systolic).toBeNull();
    expect(data.data.summary.heartRate.value).toBeNull();
  });

  it('includes date range in response', async () => {
    (prisma.clinicalNote.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost:3000/api/portal/metrics?days=7');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(data.data.dateRange.days).toBe(7);
    expect(data.data.dateRange.start).toBeDefined();
    expect(data.data.dateRange.end).toBeDefined();
  });

  it('defaults to 30 days when days param is not provided', async () => {
    (prisma.clinicalNote.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost:3000/api/portal/metrics');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(data.data.dateRange.days).toBe(30);
  });

  it('returns stable trend when no previous metric exists', async () => {
    (prisma.clinicalNote.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost:3000/api/portal/metrics');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(data.data.summary.bloodPressure.trend).toBe('stable');
    expect(data.data.summary.weight.trend).toBe('stable');
  });
});
