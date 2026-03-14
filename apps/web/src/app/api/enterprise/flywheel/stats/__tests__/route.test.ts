import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/enterprise/auth', () => ({
  validateEnterpriseKey: jest.fn(),
}));

jest.mock('@/services/data-flywheel.service', () => ({
  dataFlywheelService: {
    getStats: jest.fn(),
  },
}));

const { GET } = require('../route');
const { validateEnterpriseKey } = require('@/lib/enterprise/auth');
const { dataFlywheelService } = require('@/services/data-flywheel.service');

const makeUnauthorizedResponse = () =>
  new (require('next/server').NextResponse)(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

const mockStats = {
  totalAssessments: 120,
  tierDistribution: { tier1: 40, tier2: 50, tier3: 30 },
  latestTimestamp: '2025-03-01T00:00:00Z',
};

describe('GET /api/enterprise/flywheel/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (validateEnterpriseKey as jest.Mock).mockReturnValue({ authorized: true });
    (dataFlywheelService.getStats as jest.Mock).mockReturnValue(mockStats);
  });

  it('returns flywheel stats for authorized key', async () => {
    const req = new NextRequest('http://localhost:3000/api/enterprise/flywheel/stats', {
      headers: { 'x-pharma-partner-key': 'valid-key-123' },
    });
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.__format).toBe('enterprise_flywheel_stats_v1');
    expect(data.stats.totalAssessments).toBe(120);
  });

  it('returns 401 when API key is missing', async () => {
    (validateEnterpriseKey as jest.Mock).mockReturnValue({
      authorized: false,
      response: makeUnauthorizedResponse(),
    });
    const req = new NextRequest('http://localhost:3000/api/enterprise/flywheel/stats');
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('includes meta with apiVersion', async () => {
    const req = new NextRequest('http://localhost:3000/api/enterprise/flywheel/stats', {
      headers: { 'x-pharma-partner-key': 'valid-key-123' },
    });
    const res = await GET(req);
    const data = await res.json();

    expect(data.meta.apiVersion).toBe('1.0.0');
    expect(data.meta.generatedAt).toBeDefined();
  });

  it('calls dataFlywheelService.getStats once per request', async () => {
    const req = new NextRequest('http://localhost:3000/api/enterprise/flywheel/stats', {
      headers: { 'x-pharma-partner-key': 'valid-key-123' },
    });
    await GET(req);

    expect(dataFlywheelService.getStats).toHaveBeenCalledTimes(1);
  });
});
