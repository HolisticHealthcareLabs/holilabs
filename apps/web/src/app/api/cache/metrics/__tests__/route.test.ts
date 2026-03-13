import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn(),
}));
jest.mock('@/lib/logger', () => ({ __esModule: true, default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('@/lib/api/safe-error-response', () => ({ safeErrorResponse: jest.fn() }));
jest.mock('@/lib/cache/redis-client', () => ({
  getCacheClient: jest.fn(),
}));

const { GET, POST } = require('../route');
const { getCacheClient } = require('@/lib/cache/redis-client');

const mockContext = {
  user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
  requestId: 'req-1',
};

const mockCacheClient = {
  getMetrics: jest.fn(),
  ping: jest.fn(),
  resetMetrics: jest.fn(),
};

describe('GET /api/cache/metrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCacheClient.mockReturnValue(mockCacheClient);
    mockCacheClient.getMetrics.mockReturnValue({
      hits: 80,
      misses: 20,
      hitRate: 80,
      sets: 100,
      deletes: 10,
      totalRequests: 200,
      compressions: 50,
      circuitBreaker: 'CLOSED',
    });
    mockCacheClient.ping.mockResolvedValue(true);
  });

  it('returns cache metrics with performance data', async () => {
    const req = new NextRequest('http://localhost:3000/api/cache/metrics');
    const res = await GET(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.performance.hitRatePercentage).toBe('80%');
    expect(data.data.performance.hitRateStatus).toBe('EXCELLENT');
  });

  it('includes redis health status', async () => {
    const req = new NextRequest('http://localhost:3000/api/cache/metrics');
    const res = await GET(req, mockContext);
    const data = await res.json();
    expect(data.data.redis.healthy).toBe(true);
  });

  it('includes compression stats', async () => {
    const req = new NextRequest('http://localhost:3000/api/cache/metrics');
    const res = await GET(req, mockContext);
    const data = await res.json();
    expect(data.data.compression).toBeDefined();
    expect(data.data.compression.compressionRate).toBe('50%');
  });

  it('marks redis unhealthy when ping fails', async () => {
    mockCacheClient.ping.mockRejectedValue(new Error('Redis down'));
    const req = new NextRequest('http://localhost:3000/api/cache/metrics');
    const res = await GET(req, mockContext);
    const data = await res.json();
    expect(data.data.redis.healthy).toBe(false);
  });
});

describe('POST /api/cache/metrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCacheClient.mockReturnValue(mockCacheClient);
    mockCacheClient.resetMetrics.mockReturnValue(undefined);
  });

  it('resets cache metrics and returns success', async () => {
    const req = new NextRequest('http://localhost:3000/api/cache/metrics', { method: 'POST' });
    const res = await POST(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toMatch(/reset/i);
  });
});
