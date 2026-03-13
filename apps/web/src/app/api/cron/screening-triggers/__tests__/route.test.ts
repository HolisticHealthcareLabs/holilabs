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

jest.mock('@/lib/prevention/screening-triggers', () => ({
  autoGenerateScreeningReminders: jest.fn(),
}));

const { GET, POST } = require('../route');
const { autoGenerateScreeningReminders } = require('@/lib/prevention/screening-triggers');

const CRON_SECRET = 'test-cron-secret';

function makeRequest(overrides: { authorization?: string } = {}) {
  const headers: Record<string, string> = {
    authorization: overrides.authorization ?? `Bearer ${CRON_SECRET}`,
    'x-forwarded-for': '76.76.21.21',
  };

  return new NextRequest('http://localhost:3000/api/cron/screening-triggers', {
    headers,
  });
}

describe('/api/cron/screening-triggers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, CRON_SECRET };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('generates screening reminders with valid auth (200)', async () => {
    (autoGenerateScreeningReminders as jest.Mock).mockResolvedValue({
      patientsProcessed: 50,
      remindersCreated: 12,
    });

    const res = await GET(makeRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.patientsProcessed).toBe(50);
    expect(data.data.remindersCreated).toBe(12);
  });

  it('returns 401 when authorization header is invalid', async () => {
    const res = await GET(makeRequest({ authorization: 'Bearer wrong-secret' }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/unauthorized/i);
  });

  it('returns 500 when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET;

    const res = await GET(makeRequest());
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/CRON_SECRET/i);
  });

  it('POST delegates to the same handler', async () => {
    (autoGenerateScreeningReminders as jest.Mock).mockResolvedValue({
      patientsProcessed: 10,
      remindersCreated: 3,
    });

    const res = await POST(makeRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
