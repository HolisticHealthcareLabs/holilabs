import crypto from 'crypto';
import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() }
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    calendarIntegration: {
      upsert: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/calendar/token-encryption', () => ({
  encryptToken: jest.fn((t: string) => `enc:${t}`),
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn((_err: unknown, _opts: any) => {
    const { NextResponse } = require('next/server');
    return NextResponse.redirect('http://localhost:3000/dashboard/appointments?error=callback_failed');
  }),
}));

const TEST_SECRET = 'test-nextauth-secret';

function signState(userId: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = `${userId}:${timestamp}:${nonce}`;
  const sig = crypto.createHmac('sha256', TEST_SECRET).update(payload).digest('hex');
  return `${payload}:${sig}`;
}

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  process.env.MICROSOFT_CLIENT_ID = 'ms-client-id';
  process.env.MICROSOFT_CLIENT_SECRET = 'ms-secret';
  process.env.NEXTAUTH_SECRET = TEST_SECRET;

  global.fetch = jest.fn()
    .mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        access_token: 'access-tok',
        refresh_token: 'refresh-tok',
        expires_in: 3600,
        scope: 'Calendars.ReadWrite User.Read',
      }),
    } as any)
    .mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({ id: 'ms-user-id', userPrincipalName: 'dr@contoso.com' }),
    } as any)
    .mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({ id: 'cal-id', name: 'Calendar' }),
    } as any);

  (prisma.calendarIntegration.upsert as jest.Mock).mockResolvedValue({});
  (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
});

describe('GET /api/calendar/microsoft/callback', () => {
  it('exchanges code for tokens and redirects to success URL', async () => {
    const state = signState('user-abc');
    const url = `http://localhost:3000/api/calendar/microsoft/callback?code=auth-code-xyz&state=${encodeURIComponent(state)}`;
    const req = new NextRequest(url);
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location') || '';
    expect(location).toContain('microsoft_connected');
    expect(prisma.calendarIntegration.upsert).toHaveBeenCalled();
  });

  it('redirects with OAuth error when provider returns error param', async () => {
    const url = 'http://localhost:3000/api/calendar/microsoft/callback?error=access_denied';
    const req = new NextRequest(url);
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location') || '';
    expect(location).toContain('access_denied');
  });

  it('redirects with missing_params when code or state is absent', async () => {
    const url = 'http://localhost:3000/api/calendar/microsoft/callback?code=auth-code-xyz';
    const req = new NextRequest(url);
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location') || '';
    expect(location).toContain('missing_params');
  });

  it('redirects with token_exchange_failed when Microsoft returns error', async () => {
    const state = signState('user-abc');
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      json: jest.fn().mockResolvedValue({ error: 'invalid_grant', error_description: 'Code expired' }),
    } as any);

    const url = `http://localhost:3000/api/calendar/microsoft/callback?code=bad-code&state=${encodeURIComponent(state)}`;
    const req = new NextRequest(url);
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location') || '';
    expect(location).toContain('token_exchange_failed');
  });

  it('rejects tampered state tokens', async () => {
    global.fetch = jest.fn();
    const url = 'http://localhost:3000/api/calendar/microsoft/callback?code=auth-code&state=tampered';
    const req = new NextRequest(url);
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location') || '';
    expect(location).toContain('csrf_validation_failed');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
