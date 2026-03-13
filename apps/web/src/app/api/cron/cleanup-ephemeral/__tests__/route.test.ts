import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    workspace: { findMany: jest.fn(), delete: jest.fn() },
    tenantDiscipline: { deleteMany: jest.fn() },
    workspaceMember: { findMany: jest.fn() },
    user: { delete: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const CRON_SECRET = 'test-cron-secret';

function makeRequest(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost:3000/api/cron/cleanup-ephemeral', {
    method: 'POST',
    headers,
  });
}

describe('POST /api/cron/cleanup-ephemeral', () => {
  const origEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...origEnv, CRON_SECRET };
  });
  afterAll(() => { process.env = origEnv; });

  it('returns 401 when authorization header is missing or wrong', async () => {
    const res = await POST(makeRequest({ authorization: 'Bearer wrong' }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toMatch(/unauthorized/i);
  });

  it('returns success with 0 processed when no expired workspaces', async () => {
    (prisma.workspace.findMany as jest.Mock).mockResolvedValue([]);

    const res = await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.processed).toBe(0);
  });

  it('deletes expired ephemeral workspaces and returns summary', async () => {
    (prisma.workspace.findMany as jest.Mock).mockResolvedValue([
      { id: 'ws-1', slug: 'demo-1', expiresAt: new Date('2024-01-01') },
    ]);
    (prisma.tenantDiscipline.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });
    (prisma.workspaceMember.findMany as jest.Mock).mockResolvedValue([{ userId: 'u-1' }]);
    (prisma.workspace.delete as jest.Mock).mockResolvedValue({});
    (prisma.user.delete as jest.Mock).mockResolvedValue({});

    const res = await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.processed).toBe(1);
    expect(data.results[0].status).toBe('deleted');
  });
});
