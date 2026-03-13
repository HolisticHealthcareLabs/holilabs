import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/env', () => ({
  env: { API_BASE_URL: 'http://test-api:3001' },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

const { POST } = require('../route');

describe('POST /api/auth/login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('proxies valid credentials to backend and returns token', async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({ token: 'jwt-abc' }),
    });

    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'doc@test.com', password: 'secret123' }),
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.token).toBe('jwt-abc');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://test-api:3001/auth/login',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('returns 400 for missing email or password', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'doc@test.com' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Invalid request body');
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: 'not-json',
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('returns 502 when backend is unreachable', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'doc@test.com', password: 'secret123' }),
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(502);
    expect(json.error).toBe('Login backend unreachable');
  });
});
