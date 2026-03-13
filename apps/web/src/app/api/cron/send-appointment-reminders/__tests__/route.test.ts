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

const mockSendReminders = jest.fn();
jest.mock('@/lib/notifications/appointment-reminders', () => ({
  sendRemindersForTomorrow: mockSendReminders,
}));

const { GET, POST } = require('../route');

const CRON_SECRET = 'test-cron-secret';

function makeRequest(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost:3000/api/cron/send-appointment-reminders', {
    method: 'GET',
    headers,
  });
}

describe('/api/cron/send-appointment-reminders', () => {
  const origEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...origEnv, CRON_SECRET };
  });
  afterAll(() => { process.env = origEnv; });

  it('returns 401 with missing or wrong token', async () => {
    const res = await GET(makeRequest({ authorization: 'Bearer wrong' }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toMatch(/unauthorized/i);
  });

  it('sends reminders and returns summary', async () => {
    mockSendReminders.mockResolvedValue({ sent: 10, failed: 2 });

    const res = await GET(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.sent).toBe(10);
    expect(data.data.failed).toBe(2);
  });

  it('returns 500 on failure', async () => {
    mockSendReminders.mockRejectedValue(new Error('Notification service down'));

    const res = await GET(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
  });
});
