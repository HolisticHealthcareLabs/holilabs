import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    securityReport: { create: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const { POST, GET } = require('../route');
const { prisma } = require('@/lib/prisma');

describe('POST /api/security-reports', () => {
  beforeEach(() => jest.clearAllMocks());

  it('accepts a CSP violation report and returns 204', async () => {
    (prisma.securityReport.create as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/security-reports', {
      method: 'POST',
      body: JSON.stringify([{
        type: 'csp-violation',
        url: 'https://app.example.com/dashboard',
        user_agent: 'Mozilla/5.0',
        body: {
          'violated-directive': 'script-src',
          'blocked-uri': 'https://evil.com/script.js',
          disposition: 'enforce',
        },
      }]),
    });
    const res = await POST(req);

    expect(res.status).toBe(204);
  });

  it('stores multiple reports from array', async () => {
    (prisma.securityReport.create as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/security-reports', {
      method: 'POST',
      body: JSON.stringify([
        { type: 'csp-violation', body: { disposition: 'report' } },
        { type: 'coep', body: { disposition: 'enforce' } },
      ]),
    });
    const res = await POST(req);

    expect(res.status).toBe(204);
    expect(prisma.securityReport.create).toHaveBeenCalledTimes(2);
  });

  it('still returns 204 even when DB write fails', async () => {
    (prisma.securityReport.create as jest.Mock).mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost:3000/api/security-reports', {
      method: 'POST',
      body: JSON.stringify([{ type: 'csp-violation', body: {} }]),
    });
    const res = await POST(req);

    expect(res.status).toBe(204);
  });

  it('handles single report object (non-array)', async () => {
    (prisma.securityReport.create as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/security-reports', {
      method: 'POST',
      body: JSON.stringify({ type: 'crash', body: { reason: 'OOM' } }),
    });
    const res = await POST(req);

    expect(res.status).toBe(204);
    expect(prisma.securityReport.create).toHaveBeenCalledTimes(1);
  });
});

describe('GET /api/security-reports', () => {
  it('returns health check response', async () => {
    const req = new NextRequest('http://localhost:3000/api/security-reports');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.accepts).toContain('POST');
  });
});
