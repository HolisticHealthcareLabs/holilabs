/**
 * Tests for GET/POST /api/cds/metrics
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/cds/engines/cds-engine', () => ({
  cdsEngine: {
    getMetrics: jest.fn(),
    resetMetrics: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET, POST } = require('../route');
const { cdsEngine } = require('@/lib/cds/engines/cds-engine');

const mockMetrics = {
  totalEvaluations: 100,
  cacheHits: 70,
  cacheMisses: 30,
  avgProcessingTime: 150,
  slowEvaluations: 2,
  cacheMetrics: {
    hits: 70,
    misses: 30,
    hitRate: 70,
    totalRequests: 100,
    sets: 30,
    deletes: 5,
    errors: 0,
    compressions: 10,
    circuitBreaker: { state: 'CLOSED' },
  },
};

describe('GET /api/cds/metrics', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns metrics with healthy status (200)', async () => {
    (cdsEngine.getMetrics as jest.Mock).mockReturnValue(mockMetrics);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.metrics).toBeDefined();
    expect(data.metrics.engine.totalEvaluations).toBe(100);
  });

  it('returns degraded status when cache hit rate is low', async () => {
    (cdsEngine.getMetrics as jest.Mock).mockReturnValue({
      ...mockMetrics,
      cacheMetrics: { ...mockMetrics.cacheMetrics, hitRate: 50 },
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('degraded');
    expect(data.alerts.lowCacheHitRate).toBe(true);
  });

  it('returns 500 on engine error', async () => {
    (cdsEngine.getMetrics as jest.Mock).mockImplementation(() => { throw new Error('Metrics failure'); });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.status).toBe('error');
  });
});

describe('POST /api/cds/metrics', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resets metrics successfully (200)', async () => {
    const request = new NextRequest('http://localhost:3000/api/cds/metrics', {
      method: 'POST',
      body: JSON.stringify({ action: 'reset' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('success');
    expect(cdsEngine.resetMetrics).toHaveBeenCalled();
  });

  it('returns 400 for invalid action', async () => {
    const request = new NextRequest('http://localhost:3000/api/cds/metrics', {
      method: 'POST',
      body: JSON.stringify({ action: 'unknown' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.status).toBe('error');
  });
});
