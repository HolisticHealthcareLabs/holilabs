/**
 * GET /api/calendar/google/callback - Google OAuth callback tests
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    calendarIntegration: { upsert: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('@/lib/calendar/token-encryption', () => ({
  encryptToken: jest.fn().mockReturnValue('encrypted-token'),
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockReturnValue(
    new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 })
  ),
}));

const originalFetch = global.fetch;

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

describe('GET /api/calendar/google/callback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
    (prisma.calendarIntegration.upsert as jest.Mock).mockResolvedValue({});
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('redirects with error when OAuth error param is present', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/calendar/google/callback?error=access_denied'
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('error=access_denied');
  });

  it('redirects with error when code or state is missing', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/calendar/google/callback'
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('error=missing_params');
  });

  it('redirects with error when token exchange fails', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'invalid_grant' }),
    });

    const request = new NextRequest(
      'http://localhost:3000/api/calendar/google/callback?code=test-code&state=user-1'
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('error=token_exchange_failed');
  });

  it('upserts integration and redirects on success', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'at-123',
          refresh_token: 'rt-123',
          expires_in: 3600,
          scope: 'https://www.googleapis.com/auth/calendar',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'primary', summary: 'Primary Calendar' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'guser-1', email: 'dr@gmail.com' }),
      });

    const request = new NextRequest(
      'http://localhost:3000/api/calendar/google/callback?code=test-code&state=user-1'
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('success=google_connected');
    expect(prisma.calendarIntegration.upsert).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });
});
