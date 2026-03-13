import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { count: jest.fn().mockResolvedValue(50) },
    clinicalNote: { count: jest.fn().mockResolvedValue(200), findMany: jest.fn().mockResolvedValue([]) },
    prescription: { count: jest.fn().mockResolvedValue(75) },
    formInstance: { count: jest.fn().mockResolvedValue(30) },
  },
}));

jest.mock('@/lib/logger', () => ({
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

const { GET } = require('../route');

const ctx = { user: { id: 'doc-1', role: 'CLINICIAN' } };

describe('GET /api/analytics/dashboard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns dashboard overview with all metrics', async () => {
    const req = new NextRequest('http://localhost:3000/api/analytics/dashboard?range=30d');
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.overview).toBeDefined();
    expect(json.overview.totalPatients).toBeDefined();
    expect(json.trends).toBeDefined();
    expect(json.recentActivity).toBeDefined();
    expect(json.formCompletionRate).toBeDefined();
  });

  it('supports different date ranges', async () => {
    const req = new NextRequest('http://localhost:3000/api/analytics/dashboard?range=7d');
    const res = await GET(req, ctx);

    expect(res.status).toBe(200);
  });

  it('defaults to 30d when range is invalid', async () => {
    const req = new NextRequest('http://localhost:3000/api/analytics/dashboard?range=bogus');
    const res = await GET(req, ctx);

    expect(res.status).toBe(200);
  });

  it('returns recentActivity array with 14 days', async () => {
    const req = new NextRequest('http://localhost:3000/api/analytics/dashboard');
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(json.recentActivity).toHaveLength(14);
  });
});
