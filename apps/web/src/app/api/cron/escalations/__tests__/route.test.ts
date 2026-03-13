import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const mockBreachOverdue = jest.fn();
jest.mock('@/lib/escalations/escalation-service', () => ({
  breachOverdueEscalations: mockBreachOverdue,
}));

const { GET, POST } = require('../route');

const CRON_SECRET = 'test-cron-secret';

function makeRequest(method: string = 'GET', headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost:3000/api/cron/escalations', {
    method,
    headers,
  });
}

describe('/api/cron/escalations', () => {
  const origEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...origEnv, CRON_SECRET };
  });
  afterAll(() => { process.env = origEnv; });

  it('returns 500 when CRON_SECRET is not configured', async () => {
    process.env.CRON_SECRET = '';
    const res = await GET(makeRequest('GET', { authorization: 'Bearer x' }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toMatch(/CRON_SECRET/i);
  });

  it('returns 401 with invalid bearer token', async () => {
    const res = await GET(makeRequest('GET', { authorization: 'Bearer wrong' }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toMatch(/unauthorized/i);
  });

  it('executes breach check and returns result on GET', async () => {
    mockBreachOverdue.mockResolvedValue({ breached: 3, checked: 10 });

    const res = await GET(makeRequest('GET', { authorization: `Bearer ${CRON_SECRET}` }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.breached).toBe(3);
  });

  it('executes breach check via POST as well', async () => {
    mockBreachOverdue.mockResolvedValue({ breached: 0, checked: 5 });

    const res = await POST(makeRequest('POST', { authorization: `Bearer ${CRON_SECRET}` }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
