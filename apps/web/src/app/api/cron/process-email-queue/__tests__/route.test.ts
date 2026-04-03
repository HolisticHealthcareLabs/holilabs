import { NextRequest } from 'next/server';

const mockStartEmailWorker = jest.fn();

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

jest.mock('@/lib/email/email-queue', () => ({
  startEmailWorker: mockStartEmailWorker,
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
    mockStartEmailWorker.mockReturnValue({});
  });
  afterAll(() => { process.env = origEnv; });

  it('returns 401 with wrong token', async () => {
    const res = await POST(makeRequest('POST', { authorization: 'Bearer invalid' }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toMatch(/unauthorized/i);
  });

  it('initializes email worker and returns success', async () => {
    const res = await POST(makeRequest('POST', { authorization: `Bearer ${CRON_SECRET}` }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBeDefined();
    expect(data.duration).toBeDefined();
  });

  it('returns 500 on processing failure', async () => {
    jest.resetModules();
    const failingWorker = jest.fn(() => { throw new Error('SMTP down'); });
    jest.doMock('@/lib/email/email-queue', () => ({
      startEmailWorker: failingWorker,
    }));
    const { POST: POST2 } = require('../route');

    const res = await POST2(makeRequest('POST', { authorization: `Bearer ${CRON_SECRET}` }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
  });

  it('blocks GET in production', async () => {
    const origNodeEnv = process.env.NODE_ENV;
    (process.env as any).NODE_ENV = 'production';

    const res = await GET(makeRequest('GET', { authorization: `Bearer ${CRON_SECRET}` }));
    const data = await res.json();

    expect(res.status).toBe(405);
    (process.env as any).NODE_ENV = origNodeEnv;
  });
});
