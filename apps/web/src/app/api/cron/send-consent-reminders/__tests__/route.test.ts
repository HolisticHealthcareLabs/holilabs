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

const mockProcessReminders = jest.fn();
jest.mock('@/lib/consent/reminder-service', () => ({
  processConsentReminders: mockProcessReminders,
}));

const { POST, GET } = require('../route');

const CRON_SECRET = 'test-cron-secret';

function makeRequest(method: string, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost:3000/api/cron/send-consent-reminders', {
    method,
    headers,
  });
}

describe('/api/cron/send-consent-reminders', () => {
  const origEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...origEnv, CRON_SECRET };
  });
  afterAll(() => { process.env = origEnv; });

  it('returns 401 with wrong bearer token', async () => {
    const res = await POST(makeRequest('POST', { authorization: 'Bearer nope' }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toMatch(/unauthorized/i);
  });

  it('processes consent reminders successfully', async () => {
    mockProcessReminders.mockResolvedValue({ processed: 5, skipped: 2, failed: 0 });

    const res = await POST(makeRequest('POST', { authorization: `Bearer ${CRON_SECRET}` }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.processed).toBe(5);
    expect(data.skipped).toBe(2);
  });

  it('returns 500 on failure', async () => {
    mockProcessReminders.mockRejectedValue(new Error('DB failure'));

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
