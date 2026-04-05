jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  _prisma: { $queryRaw: jest.fn() },
}));

const { GET } = require('../route');

describe('GET /api/health/startup', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      DATABASE_URL: 'postgresql://localhost:5432/test',
      ENCRYPTION_KEY: 'test-key-32-characters-long-xxxx',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns 200 when all startup checks pass', async () => {
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('started');
    expect(data.checks.database.status).toBe('ok');
    expect(data.checks.encryption.status).toBe('ok');
    expect(data.timestamp).toBeDefined();
  });

  it('returns 503 when DATABASE_URL is missing', async () => {
    delete process.env.DATABASE_URL;

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.status).toBe('not_started');
    expect(data.checks.database.status).toBe('failed');
    expect(data.checks.database.error).toContain('DATABASE_URL');
  });

  it('returns 503 when ENCRYPTION_KEY is missing', async () => {
    delete process.env.ENCRYPTION_KEY;

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.status).toBe('not_started');
    expect(data.checks.encryption.status).toBe('failed');
    expect(data.checks.encryption.error).toContain('ENCRYPTION_KEY');
  });

  it('returns 503 when both are missing', async () => {
    delete process.env.DATABASE_URL;
    delete process.env.ENCRYPTION_KEY;

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.checks.database.status).toBe('failed');
    expect(data.checks.encryption.status).toBe('failed');
  });

  it('sets no-cache headers', async () => {
    const res = await GET();
    expect(res.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
  });
});
