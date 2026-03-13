import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));
jest.mock('@/lib/logger', () => ({ __esModule: true, default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockReturnValue(
    new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })
  ),
}));

const { GET } = require('../route');

describe('GET /api/health/live', () => {
  it('returns 200 with status ok', async () => {
    const req = new NextRequest('http://localhost:3000/api/health/live');
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.status).toBe('ok');
  });

  it('includes process uptime and memory stats', async () => {
    const req = new NextRequest('http://localhost:3000/api/health/live');
    const res = await GET(req);
    const data = await res.json();
    expect(data.uptime).toBeGreaterThanOrEqual(0);
    expect(data.memory).toBeDefined();
    expect(data.memory.rss).toMatch(/\d+MB/);
  });

  it('includes pid and nodeVersion', async () => {
    const req = new NextRequest('http://localhost:3000/api/health/live');
    const res = await GET(req);
    const data = await res.json();
    expect(data.pid).toBeGreaterThan(0);
    expect(data.nodeVersion).toMatch(/^v\d+/);
  });

  it('includes a timestamp', async () => {
    const req = new NextRequest('http://localhost:3000/api/health/live');
    const res = await GET(req);
    const data = await res.json();
    expect(new Date(data.timestamp)).toBeInstanceOf(Date);
  });
});
