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
  safeErrorResponse: jest.fn().mockImplementation((_err: any, opts: any) =>
    new (require('next/server').NextResponse)(
      JSON.stringify({ error: opts?.userMessage || 'Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  ),
}));

const mockExecuteReminders = jest.fn();
jest.mock('@/lib/jobs/reminder-executor', () => ({
  executeScheduledReminders: mockExecuteReminders,
}));

const { GET, POST } = require('../route');

const CRON_SECRET = 'test-cron-secret';

function makeRequest(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost:3000/api/cron/execute-reminders', {
    method: 'GET',
    headers,
  });
}

describe('/api/cron/execute-reminders', () => {
  const origEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...origEnv, CRON_SECRET };
  });
  afterAll(() => { process.env = origEnv; });

  it('returns 401 with invalid token', async () => {
    const res = await GET(makeRequest({ authorization: 'Bearer wrong' }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toMatch(/unauthorized/i);
  });

  it('returns 500 when CRON_SECRET is not configured', async () => {
    process.env.CRON_SECRET = '';
    const res = await GET(makeRequest({ authorization: 'Bearer x' }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toMatch(/CRON_SECRET/i);
  });

  it('executes reminders successfully', async () => {
    mockExecuteReminders.mockResolvedValue({ sent: 5, failed: 0 });

    const res = await GET(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.stats).toEqual({ sent: 5, failed: 0 });
  });

  it('returns 500 when executor throws after retries', async () => {
    mockExecuteReminders.mockRejectedValue(new Error('DB connection lost'));

    const res = await GET(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
  });
});
