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

const mockExpireConsents = jest.fn();
jest.mock('@/lib/consent/expiration-checker', () => ({
  expireAllExpiredConsents: mockExpireConsents,
}));

const { POST, GET } = require('../route');

const CRON_SECRET = 'test-cron-secret';

function makeRequest(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost:3000/api/cron/expire-consents', {
    method: 'POST',
    headers,
  });
}

describe('/api/cron/expire-consents', () => {
  const origEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...origEnv, CRON_SECRET };
  });
  afterAll(() => { process.env = origEnv; });

  it('returns 401 with invalid bearer token', async () => {
    const res = await POST(makeRequest({ authorization: 'Bearer wrong' }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toMatch(/unauthorized/i);
  });

  it('expires consents successfully via POST', async () => {
    mockExpireConsents.mockResolvedValue(7);

    const res = await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.expiredCount).toBe(7);
  });

  it('returns 500 when expiration service throws', async () => {
    mockExpireConsents.mockRejectedValue(new Error('DB timeout'));

    const res = await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
  });

  it('blocks GET in production', async () => {
    const origNodeEnv = process.env.NODE_ENV;
    (process.env as any).NODE_ENV = 'production';

    const req = new NextRequest('http://localhost:3000/api/cron/expire-consents', {
      method: 'GET',
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(405);
    (process.env as any).NODE_ENV = origNodeEnv;
  });
});
