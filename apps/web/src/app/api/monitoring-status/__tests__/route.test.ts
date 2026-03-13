import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => {
  const mock = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
  return { __esModule: true, default: mock, logger: mock };
});

const { GET } = require('../route');

const mockContext = {
  user: { id: 'admin-1', email: 'admin@holilabs.com', role: 'ADMIN' },
  requestId: 'req-1',
};

describe('GET /api/monitoring-status', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns fully_configured when all services have valid env vars', async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_abc123xyz';
    process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://app.posthog.com';
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://key@sentry.io/123';
    process.env.LOGTAIL_SOURCE_TOKEN = 'a'.repeat(21);

    const req = new NextRequest('http://localhost:3000/api/monitoring-status');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('fully_configured');
    expect(data.services.posthog.configured).toBe(true);
    expect(data.services.sentry.configured).toBe(true);
    expect(data.services.logtail.configured).toBe(true);
    expect(data.summary.configured).toBe(3);
  });

  it('returns partially_configured when only some services are set', async () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://key@sentry.io/123';
    delete process.env.LOGTAIL_SOURCE_TOKEN;

    const req = new NextRequest('http://localhost:3000/api/monitoring-status');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('partially_configured');
    expect(data.services.posthog.configured).toBe(false);
    expect(data.services.sentry.configured).toBe(true);
    expect(data.summary.configured).toBe(1);
  });

  it('returns not_configured when no env vars are set', async () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    delete process.env.LOGTAIL_SOURCE_TOKEN;

    const req = new NextRequest('http://localhost:3000/api/monitoring-status');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('not_configured');
    expect(data.summary.configured).toBe(0);
    expect(data.nextSteps).toHaveLength(3);
  });

  it('reports partial posthog status when key present but host missing', async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_abc123xyz';
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    delete process.env.LOGTAIL_SOURCE_TOKEN;

    const req = new NextRequest('http://localhost:3000/api/monitoring-status');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.services.posthog.status).toBe('partial');
    expect(data.services.posthog.keyPresent).toBe(true);
    expect(data.services.posthog.hostPresent).toBe(false);
  });
});
