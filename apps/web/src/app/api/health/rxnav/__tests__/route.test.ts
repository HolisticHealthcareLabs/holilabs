import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any, _opts?: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/integrations/monitoring', () => ({
  getHealthMetrics: jest.fn(),
}));

const { GET } = require('../route');
const { getHealthMetrics } = require('@/lib/integrations/monitoring');

describe('GET /api/health/rxnav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getHealthMetrics as jest.Mock).mockReturnValue({
      rxnav: { status: 'healthy', latencyMs: 45, cacheHitRate: 0.92 },
    });
  });

  it('returns health metrics successfully', async () => {
    const req = new NextRequest('http://localhost:3000/api/health/rxnav');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.timestamp).toBeDefined();
    expect(data.rxnav.status).toBe('healthy');
  });

  it('includes a timestamp in the response', async () => {
    const req = new NextRequest('http://localhost:3000/api/health/rxnav');
    const res = await GET(req);
    const data = await res.json();

    expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
  });

  it('returns 500 and error message when getHealthMetrics throws', async () => {
    (getHealthMetrics as jest.Mock).mockImplementation(() => {
      throw new Error('Monitoring unavailable');
    });
    const req = new NextRequest('http://localhost:3000/api/health/rxnav');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toContain('health metrics');
  });

  it('spreads metrics into the response body', async () => {
    (getHealthMetrics as jest.Mock).mockReturnValue({
      rxnav: { status: 'healthy' },
      cache: { size: 500 },
    });
    const req = new NextRequest('http://localhost:3000/api/health/rxnav');
    const res = await GET(req);
    const data = await res.json();

    expect(data.cache).toBeDefined();
    expect(data.cache.size).toBe(500);
  });
});
