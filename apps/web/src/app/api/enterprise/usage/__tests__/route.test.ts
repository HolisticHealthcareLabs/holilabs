import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/enterprise/auth', () => ({
  validateEnterpriseKey: jest.fn(),
}));

jest.mock('@/lib/enterprise/usage-meter', () => ({
  enterpriseUsageMeter: {
    getUsageSummary: jest.fn(),
    getUsageTrend: jest.fn(),
  },
}));

const { GET } = require('../route');
const { validateEnterpriseKey } = require('@/lib/enterprise/auth');
const { enterpriseUsageMeter } = require('@/lib/enterprise/usage-meter');

const makeUnauthorizedResponse = () =>
  new (require('next/server').NextResponse)(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

describe('GET /api/enterprise/usage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (validateEnterpriseKey as jest.Mock).mockReturnValue({ authorized: true });
    (enterpriseUsageMeter.getUsageSummary as jest.Mock).mockReturnValue({ totalCalls: 500 });
    (enterpriseUsageMeter.getUsageTrend as jest.Mock).mockReturnValue([{ date: '2025-03-01', calls: 50 }]);
  });

  it('returns usage summary without period param', async () => {
    const req = new NextRequest('http://localhost:3000/api/enterprise/usage', {
      headers: { 'x-pharma-partner-key': 'valid-key-12345678' },
    });
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.__format).toBe('enterprise_usage_summary_v1');
    expect(data.summary).toBeDefined();
  });

  it('returns usage trend when valid period is provided', async () => {
    const req = new NextRequest('http://localhost:3000/api/enterprise/usage?period=day', {
      headers: { 'x-pharma-partner-key': 'valid-key-12345678' },
    });
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.__format).toBe('enterprise_usage_trend_v1');
    expect(data.trend).toBeDefined();
  });

  it('returns 400 when period param is invalid', async () => {
    const req = new NextRequest('http://localhost:3000/api/enterprise/usage?period=yearly', {
      headers: { 'x-pharma-partner-key': 'valid-key-12345678' },
    });
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.message).toContain('period');
  });

  it('returns 401 when API key is invalid', async () => {
    (validateEnterpriseKey as jest.Mock).mockReturnValue({
      authorized: false,
      response: makeUnauthorizedResponse(),
    });
    const req = new NextRequest('http://localhost:3000/api/enterprise/usage');
    const res = await GET(req);

    expect(res.status).toBe(401);
  });
});
