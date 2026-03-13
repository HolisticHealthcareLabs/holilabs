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

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

describe('GET /api/health/system', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns system health with all services checked', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);
    process.env.ANTHROPIC_API_KEY = 'test-key';
    process.env.DEEPGRAM_API_KEY = 'test-key';
    process.env.ENCRYPTION_KEY = 'a'.repeat(64);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.services.database.status).toBe('healthy');
    expect(data.services.anthropic.status).toBe('healthy');
    expect(data.services.deepgram.status).toBe('healthy');
    expect(data.services.encryption.status).toBe('healthy');
    expect(data.summary).toBeDefined();
    expect(data.summary.total).toBe(7);
  });

  it('reports error when database is down', async () => {
    (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Connection refused'));

    const res = await GET();
    const data = await res.json();

    expect(data.services.database.status).toBe('error');
    expect(data.summary.error).toBeGreaterThanOrEqual(1);
  });

  it('reports error when API keys are missing', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.DEEPGRAM_API_KEY;
    delete process.env.ENCRYPTION_KEY;

    const res = await GET();
    const data = await res.json();

    expect(data.services.anthropic.status).toBe('error');
    expect(data.services.deepgram.status).toBe('error');
    expect(data.services.encryption.status).toBe('error');
  });

  it('reports error for invalid encryption key length', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);
    process.env.ENCRYPTION_KEY = 'too-short';

    const res = await GET();
    const data = await res.json();

    expect(data.services.encryption.status).toBe('error');
  });
});
