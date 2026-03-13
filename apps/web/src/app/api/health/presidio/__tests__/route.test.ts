import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

// Mock global fetch for presidio health checks
const mockFetch = jest.fn();
global.fetch = mockFetch;

const { GET } = require('../route');

describe('GET /api/health/presidio', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns healthy status when both services are up', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, text: async () => 'OK' });
    const req = new NextRequest('http://localhost:3000/api/health/presidio');
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.analyzer.ok).toBe(true);
    expect(data.anonymizer.ok).toBe(true);
  });

  it('returns error status when analyzer is down', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 503, text: async () => 'Service Unavailable' })
      .mockResolvedValueOnce({ ok: true, status: 200, text: async () => 'OK' });
    const req = new NextRequest('http://localhost:3000/api/health/presidio');
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(503);
    expect(data.status).toBe('error');
    expect(data.analyzer.ok).toBe(false);
  });

  it('returns error status when anonymizer is down', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, text: async () => 'OK' })
      .mockResolvedValueOnce({ ok: false, status: 503, text: async () => 'Error' });
    const req = new NextRequest('http://localhost:3000/api/health/presidio');
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(503);
    expect(data.status).toBe('error');
  });

  it('returns error when fetch throws (connection refused)', async () => {
    mockFetch.mockRejectedValue(new Error('Connection refused'));
    const req = new NextRequest('http://localhost:3000/api/health/presidio');
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(503);
    expect(data.status).toBe('error');
  });
});
