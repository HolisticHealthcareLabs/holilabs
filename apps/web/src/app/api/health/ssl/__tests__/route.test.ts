import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn(),
}));

const { GET } = require('../route');

describe('GET /api/health/ssl', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns skipped status when domain is localhost (default)', async () => {
    const savedUrl = process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    const req = new NextRequest('http://localhost:3000/api/health/ssl');
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.status).toBe('skipped');
    if (savedUrl !== undefined) process.env.NEXT_PUBLIC_APP_URL = savedUrl;
  });

  it('includes domain and environment fields in response', async () => {
    const savedUrl = process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    const req = new NextRequest('http://localhost:3000/api/health/ssl');
    const res = await GET(req);
    const data = await res.json();
    expect(data.domain).toBeDefined();
    expect(data.message).toBeDefined();
    if (savedUrl !== undefined) process.env.NEXT_PUBLIC_APP_URL = savedUrl;
  });

  it('returns skipped with message when NODE_ENV is test', async () => {
    const savedUrl = process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    const req = new NextRequest('http://localhost:3000/api/health/ssl');
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.status).toBe('skipped');
    expect(data.message).toMatch(/skip/i);
    if (savedUrl !== undefined) process.env.NEXT_PUBLIC_APP_URL = savedUrl;
  });
});
