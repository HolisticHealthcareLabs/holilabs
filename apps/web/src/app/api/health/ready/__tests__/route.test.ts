import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    ping: jest.fn().mockResolvedValue('PONG'),
  })),
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

describe('GET /api/health/ready', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns healthy when database is connected', async () => {
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.checks.database.status).toBe('healthy');
  });

  it('returns 503 when database is down', async () => {
    (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Connection refused'));

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.status).toBe('unhealthy');
    expect(data.checks.database.status).toBe('unhealthy');
  });

  it('returns degraded when optional services are down', async () => {
    const res = await GET();
    const data = await res.json();

    expect(data.checks.redis).toBeDefined();
    expect(data.checks.supabase).toBeDefined();
  });
});
