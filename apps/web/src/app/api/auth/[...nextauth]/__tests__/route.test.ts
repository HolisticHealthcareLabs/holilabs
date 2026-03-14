import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/auth/auth', () => ({
  GET: jest.fn(),
  POST: jest.fn(),
}));

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn().mockResolvedValue(null), // null = not rate limited
}));

const { GET, POST } = require('../route');
const { GET: authGet, POST: authPost } = require('@/lib/auth/auth');
const { checkRateLimit } = require('@/lib/rate-limit');

const mockAuthResponse = new Response(JSON.stringify({ session: 'active' }), { status: 200 });
const mockRateLimitResponse = new Response(JSON.stringify({ error: 'Too Many Requests' }), { status: 429 });

describe('GET /api/auth/[...nextauth]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('delegates to NextAuth GET handler', async () => {
    (authGet as jest.Mock).mockResolvedValue(mockAuthResponse);

    const req = new NextRequest('http://localhost:3000/api/auth/session');
    const res = await GET(req, { params: ['session'] });

    expect(authGet).toHaveBeenCalledWith(req, { params: ['session'] });
    expect(res.status).toBe(200);
  });

  it('handles CSRF endpoint requests', async () => {
    (authGet as jest.Mock).mockResolvedValue(new Response(JSON.stringify({ csrfToken: 'token123' }), { status: 200 }));

    const req = new NextRequest('http://localhost:3000/api/auth/csrf');
    const res = await GET(req, { params: ['csrf'] });

    expect(authGet).toHaveBeenCalled();
  });
});

describe('POST /api/auth/[...nextauth]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('delegates non-credentials POST to NextAuth handler', async () => {
    (authPost as jest.Mock).mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const req = new NextRequest('http://localhost:3000/api/auth/signout', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req, { params: ['signout'] });

    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(authPost).toHaveBeenCalled();
  });

  it('applies rate limiting to credentials callback endpoint', async () => {
    (checkRateLimit as jest.Mock).mockResolvedValue(null); // not rate limited
    (authPost as jest.Mock).mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const req = new NextRequest('http://localhost:3000/api/auth/callback/credentials', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@test.com', password: 'password123' }),
    });
    const res = await POST(req, { params: ['callback', 'credentials'] });

    expect(checkRateLimit).toHaveBeenCalledWith(req, 'auth');
    expect(authPost).toHaveBeenCalled();
  });

  it('returns rate limit response when credentials endpoint is rate limited', async () => {
    (checkRateLimit as jest.Mock).mockResolvedValue(mockRateLimitResponse);

    const req = new NextRequest('http://localhost:3000/api/auth/callback/credentials', {
      method: 'POST',
      body: JSON.stringify({ email: 'attacker@test.com', password: 'attempt' }),
    });
    const res = await POST(req, { params: ['callback', 'credentials'] });

    expect(res.status).toBe(429);
    expect(authPost).not.toHaveBeenCalled();
  });
});
