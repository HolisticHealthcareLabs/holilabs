import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn(),
}));

const mockProcessQueue = jest.fn();
jest.mock('@/lib/email/email-service', () => ({
  processEmailQueue: mockProcessQueue,
}));

const { POST, GET } = require('../route');

const CRON_SECRET = 'test-cron-secret';

function makeRequest(method: string, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost:3000/api/cron/process-email-queue', {
    method,
    headers,
  });
}

describe('/api/cron/process-email-queue', () => {
  const origEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...origEnv, CRON_SECRET };
  });
  afterAll(() => { process.env = origEnv; });

  it('returns 401 with wrong token', async () => {
    const res = await POST(makeRequest('POST', { authorization: 'Bearer invalid' }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toMatch(/unauthorized/i);
  });

  it('processes email queue and returns stats', async () => {
    mockProcessQueue.mockResolvedValue({ processed: 12, failed: 1 });

    const res = await POST(makeRequest('POST', { authorization: `Bearer ${CRON_SECRET}` }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.processed).toBe(12);
    expect(data.failed).toBe(1);
  });

  it('returns 500 on processing failure', async () => {
    mockProcessQueue.mockRejectedValue(new Error('SMTP down'));

    const res = await POST(makeRequest('POST', { authorization: `Bearer ${CRON_SECRET}` }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
  });

  it('blocks GET in production', async () => {
    const origNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const res = await GET(makeRequest('GET', { authorization: `Bearer ${CRON_SECRET}` }));
    const data = await res.json();

    expect(res.status).toBe(405);
    process.env.NODE_ENV = origNodeEnv;
  });
});
