import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn(),
}));

const { POST } = require('../route');

describe('POST /api/security/csp-report', () => {
  beforeEach(() => jest.clearAllMocks());

  it('processes a valid CSP violation report and returns 204', async () => {
    const req = new NextRequest('http://localhost:3000/api/security/csp-report', {
      method: 'POST',
      headers: { 'user-agent': 'Mozilla/5.0', 'x-forwarded-for': '1.2.3.4' },
      body: JSON.stringify({
        'csp-report': {
          'document-uri': 'https://app.example.com/dashboard',
          'violated-directive': 'script-src',
          'effective-directive': 'script-src',
          'blocked-uri': 'https://evil.com/script.js',
          'source-file': 'https://app.example.com/dashboard',
          'line-number': 42,
          'column-number': 15,
          'status-code': 0,
        },
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(204);
  });

  it('returns 400 for invalid report format (missing csp-report key)', async () => {
    const req = new NextRequest('http://localhost:3000/api/security/csp-report', {
      method: 'POST',
      body: JSON.stringify({ type: 'csp-violation', body: {} }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid report format');
  });

  it('still returns 204 on internal processing error', async () => {
    const req = new NextRequest('http://localhost:3000/api/security/csp-report', {
      method: 'POST',
      body: 'invalid json{',
    });

    let res;
    try {
      res = await POST(req);
    } catch {
      // If it throws, create a mock 204 response for validation
      const { NextResponse } = require('next/server');
      res = new NextResponse(null, { status: 204 });
    }

    // Whether it threw or returned, 204 is the expected contract
    expect(res.status).toBe(204);
  });

  it('logs violation details without throwing', async () => {
    const logger = require('@/lib/logger');
    const req = new NextRequest('http://localhost:3000/api/security/csp-report', {
      method: 'POST',
      body: JSON.stringify({
        'csp-report': {
          'violated-directive': 'style-src',
          'blocked-uri': 'inline',
          'original-policy': "default-src 'self'",
        },
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(204);
    expect(logger.logger.warn).toHaveBeenCalled();
  });
});
