import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

const { GET } = require('../route');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'admin-1', role: 'ADMIN' },
  params: {},
};

describe('GET /api/fog-node/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns connected: true when sidecar responds successfully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ version: '1.0.0', uptime: 3600 }),
    } as any);

    const req = new NextRequest('http://localhost:3000/api/fog-node/status');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.connected).toBe(true);
    expect(data.version).toBe('1.0.0');
  });

  it('returns connected: false when sidecar returns non-OK status', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
    } as any);

    const req = new NextRequest('http://localhost:3000/api/fog-node/status');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.connected).toBe(false);
  });

  it('returns connected: false when fetch throws (sidecar unreachable)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const req = new NextRequest('http://localhost:3000/api/fog-node/status');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.connected).toBe(false);
  });

  it('returns connected: false on AbortError timeout', async () => {
    const abortError = new DOMException('The operation was aborted', 'AbortError');
    global.fetch = jest.fn().mockRejectedValue(abortError);

    const req = new NextRequest('http://localhost:3000/api/fog-node/status');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(data.connected).toBe(false);
  });
});
