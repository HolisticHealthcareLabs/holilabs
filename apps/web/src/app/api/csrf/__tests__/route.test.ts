import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/security/csrf', () => ({
  generateCsrfToken: jest.fn(),
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn((_err: unknown, opts: any) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: opts?.userMessage || 'Internal server error' }, { status: 500 });
  }),
}));

const { GET } = require('../route');
const { generateCsrfToken } = require('@/lib/security/csrf');

beforeEach(() => {
  jest.clearAllMocks();
  (generateCsrfToken as jest.Mock).mockReturnValue('csrf-token-abc123def456');
});

describe('GET /api/csrf', () => {
  it('returns a CSRF token and sets it as a cookie', async () => {
    const req = new NextRequest('http://localhost:3000/api/csrf');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.token).toBe('csrf-token-abc123def456');
    const setCookie = res.headers.get('set-cookie') || '';
    expect(setCookie).toContain('csrf-token');
  });

  it('sets HttpOnly flag on the CSRF cookie', async () => {
    const req = new NextRequest('http://localhost:3000/api/csrf');
    const res = await GET(req);

    const setCookie = res.headers.get('set-cookie') || '';
    expect(setCookie.toLowerCase()).toContain('httponly');
  });

  it('returns 500 when token generation throws', async () => {
    (generateCsrfToken as jest.Mock).mockImplementation(() => {
      throw new Error('Entropy source failure');
    });

    const req = new NextRequest('http://localhost:3000/api/csrf');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
  });
});
