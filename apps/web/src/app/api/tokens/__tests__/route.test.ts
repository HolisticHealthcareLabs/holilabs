import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));
jest.mock('@/lib/logger', () => ({
  __esModule: true,
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET, POST } = require('../route');

const mockContext = {
  user: { id: 'user-1', email: 'dr@test.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('GET /api/tokens', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns token map summary when no params provided', async () => {
    const req = new NextRequest('http://localhost:3000/api/tokens');
    const res = await GET(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.summary.endpointsTracked).toBeGreaterThan(0);
  });

  it('returns full token map when all=true', async () => {
    const req = new NextRequest('http://localhost:3000/api/tokens?all=true');
    const res = await GET(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.tokenMap).toBeDefined();
  });

  it('returns default estimate for unknown endpoint', async () => {
    const req = new NextRequest('http://localhost:3000/api/tokens?endpoint=/api/unknown/route');
    const res = await GET(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.estimate.known).toBe(false);
  });

  it('returns session usage when sessionId provided', async () => {
    const req = new NextRequest('http://localhost:3000/api/tokens?sessionId=test-session-1');
    const res = await GET(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.session.sessionId).toBe('test-session-1');
  });
});

describe('POST /api/tokens', () => {
  beforeEach(() => jest.clearAllMocks());

  it('records token usage and returns budget', async () => {
    const req = new NextRequest('http://localhost:3000/api/tokens', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'sess-1', inputTokens: 100, outputTokens: 200, endpoint: '/api/patients' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.budget).toBeDefined();
  });

  it('returns 400 when sessionId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/tokens', {
      method: 'POST',
      body: JSON.stringify({ inputTokens: 100 }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe('sessionId is required');
  });
});
