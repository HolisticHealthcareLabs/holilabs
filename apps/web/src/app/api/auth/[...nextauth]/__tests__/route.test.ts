/**
 * Tests for /api/auth/[...nextauth]
 *
 * The route is a direct re-export: export { GET, POST } from '@/lib/auth/auth'
 * No middleware wrapping, no rate limiting at this layer.
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/auth/auth', () => ({
  GET: jest.fn(),
  POST: jest.fn(),
}));

const { GET, POST } = require('../route');
const { GET: authGet, POST: authPost } = require('@/lib/auth/auth');

describe('GET /api/auth/[...nextauth]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('delegates to NextAuth GET handler', async () => {
    const mockResponse = new Response(JSON.stringify({ session: 'active' }), { status: 200 });
    (authGet as jest.Mock).mockResolvedValue(mockResponse);

    const req = new NextRequest('http://localhost:3000/api/auth/session');
    const res = await GET(req, { params: ['session'] });

    expect(authGet).toHaveBeenCalledWith(req, { params: ['session'] });
    expect(res.status).toBe(200);
  });

  it('handles CSRF endpoint requests', async () => {
    (authGet as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ csrfToken: 'token123' }), { status: 200 })
    );

    const req = new NextRequest('http://localhost:3000/api/auth/csrf');
    await GET(req, { params: ['csrf'] });

    expect(authGet).toHaveBeenCalled();
  });
});

describe('POST /api/auth/[...nextauth]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('delegates POST to NextAuth handler', async () => {
    (authPost as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );

    const req = new NextRequest('http://localhost:3000/api/auth/signout', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req, { params: ['signout'] });

    expect(authPost).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it('delegates credentials callback POST to NextAuth handler', async () => {
    (authPost as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );

    const req = new NextRequest('http://localhost:3000/api/auth/callback/credentials', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@test.com', password: 'password123' }),
    });
    const res = await POST(req, { params: ['callback', 'credentials'] });

    expect(authPost).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });
});
