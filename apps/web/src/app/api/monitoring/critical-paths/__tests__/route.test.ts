import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/monitoring/critical-paths', () => ({
  getCriticalPathHealth: jest.fn(),
  getAllCriticalPathMetrics: jest.fn(),
  clearCriticalPathMetrics: jest.fn(),
}));

jest.mock('@/lib/logger', () => {
  const mock = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
  return { __esModule: true, default: mock, logger: mock };
});

const { GET, POST } = require('../route');
const criticalPaths = require('@/lib/monitoring/critical-paths');

const mockContext = {
  user: { id: 'admin-1', email: 'admin@holilabs.com', role: 'ADMIN' },
  requestId: 'req-1',
};

const healthyHealth = {
  status: 'healthy',
  totalPaths: 2,
  healthyPaths: 2,
  degradedPaths: 0,
  unhealthyPaths: 0,
  details: [
    { path: '/api/health', status: 'healthy' },
    { path: '/api/patients', status: 'healthy' },
  ],
};

const mockMetrics = [
  {
    path: '/api/health',
    totalExecutions: 100,
    successRate: 99.5,
    averageDuration: 45,
    p50Duration: 40,
    p95Duration: 80,
    p99Duration: 150,
    targetMet: 95,
    warningLevel: 4,
    criticalLevel: 1,
    exceeded: 0,
  },
];

describe('GET /api/monitoring/critical-paths', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with healthy status and metrics', async () => {
    (criticalPaths.getCriticalPathHealth as jest.Mock).mockReturnValue(healthyHealth);
    (criticalPaths.getAllCriticalPathMetrics as jest.Mock).mockReturnValue(mockMetrics);

    const req = new NextRequest('http://localhost:3000/api/monitoring/critical-paths');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.summary.totalPaths).toBe(2);
    expect(data.summary.healthyPaths).toBe(2);
    expect(data.metrics).toHaveLength(1);
    expect(data.metrics[0].successRate).toBe('99.50%');
  });

  it('returns 503 when status is unhealthy', async () => {
    (criticalPaths.getCriticalPathHealth as jest.Mock).mockReturnValue({
      ...healthyHealth,
      status: 'unhealthy',
      healthyPaths: 1,
      unhealthyPaths: 1,
      details: [
        { path: '/api/health', status: 'healthy' },
        { path: '/api/patients', status: 'unhealthy' },
      ],
    });
    (criticalPaths.getAllCriticalPathMetrics as jest.Mock).mockReturnValue([]);

    const req = new NextRequest('http://localhost:3000/api/monitoring/critical-paths');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.status).toBe('unhealthy');
  });

  it('returns 500 when getCriticalPathHealth throws', async () => {
    (criticalPaths.getCriticalPathHealth as jest.Mock).mockImplementation(() => {
      throw new Error('Internal error');
    });

    const req = new NextRequest('http://localhost:3000/api/monitoring/critical-paths');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.status).toBe('error');
  });
});

describe('POST /api/monitoring/critical-paths', () => {
  beforeEach(() => jest.clearAllMocks());

  it('clears metrics when action is clear', async () => {
    const req = new NextRequest('http://localhost:3000/api/monitoring/critical-paths', {
      method: 'POST',
      body: JSON.stringify({ action: 'clear' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('success');
    expect(criticalPaths.clearCriticalPathMetrics).toHaveBeenCalled();
  });

  it('returns 400 for unknown action', async () => {
    const req = new NextRequest('http://localhost:3000/api/monitoring/critical-paths', {
      method: 'POST',
      body: JSON.stringify({ action: 'unknown' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.status).toBe('error');
  });
});
