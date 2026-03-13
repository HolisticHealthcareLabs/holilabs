import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue({ id: 'audit-1' }),
}));

const { GET } = require('../route');

describe('GET /api/scribe/deepgram-token', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 410 when browser token is disabled', async () => {
    const original = process.env.ALLOW_DEEPGRAM_BROWSER_TOKEN;
    delete process.env.ALLOW_DEEPGRAM_BROWSER_TOKEN;

    const res = await GET(new NextRequest('http://localhost:3000/api/scribe/deepgram-token'));
    const data = await res.json();

    expect(res.status).toBe(410);
    expect(data.error).toContain('disabled');

    process.env.ALLOW_DEEPGRAM_BROWSER_TOKEN = original;
  });

  it('returns 500 when DEEPGRAM_API_KEY not configured', async () => {
    const originalAllow = process.env.ALLOW_DEEPGRAM_BROWSER_TOKEN;
    const originalKey = process.env.DEEPGRAM_API_KEY;
    process.env.ALLOW_DEEPGRAM_BROWSER_TOKEN = 'true';
    delete process.env.DEEPGRAM_API_KEY;

    const res = await GET(new NextRequest('http://localhost:3000/api/scribe/deepgram-token'));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toContain('not configured');

    process.env.ALLOW_DEEPGRAM_BROWSER_TOKEN = originalAllow;
    process.env.DEEPGRAM_API_KEY = originalKey;
  });

  it('returns token when enabled and configured', async () => {
    const originalAllow = process.env.ALLOW_DEEPGRAM_BROWSER_TOKEN;
    const originalKey = process.env.DEEPGRAM_API_KEY;
    process.env.ALLOW_DEEPGRAM_BROWSER_TOKEN = 'true';
    process.env.DEEPGRAM_API_KEY = 'test-deepgram-key';

    const { createAuditLog } = require('@/lib/audit');

    const res = await GET(new NextRequest('http://localhost:3000/api/scribe/deepgram-token'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.token).toBe('test-deepgram-key');
    expect(createAuditLog).toHaveBeenCalled();

    process.env.ALLOW_DEEPGRAM_BROWSER_TOKEN = originalAllow;
    process.env.DEEPGRAM_API_KEY = originalKey;
  });
});
