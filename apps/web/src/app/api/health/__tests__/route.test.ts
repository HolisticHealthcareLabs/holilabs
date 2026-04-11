import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {},
  checkDatabaseHealth: jest.fn(),
}));

jest.mock('@/lib/security/encryption', () => ({
  encryptPHIWithVersion: jest.fn().mockResolvedValue('encrypted'),
  decryptPHIWithVersion: jest.fn().mockResolvedValue('health-check-test'),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() }
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn(),
}));

const { GET } = require('../route');
const { checkDatabaseHealth } = require('@/lib/prisma');
const { encryptPHIWithVersion, decryptPHIWithVersion } = require('@/lib/security/encryption');

describe('GET /api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ENCRYPTION_KEY = 'test-key-32-characters-long-xxxx';
    (encryptPHIWithVersion as jest.Mock).mockResolvedValue('encrypted');
    (decryptPHIWithVersion as jest.Mock).mockResolvedValue('health-check-test');
  });

  it('returns healthy status when all checks pass', async () => {
    (checkDatabaseHealth as jest.Mock).mockResolvedValue({ healthy: true, latency: 5 });

    const req = new NextRequest('http://localhost:3000/api/health');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe('healthy');
    expect(json.checks.database.status).toBe('up');
    expect(json.checks.encryption.status).toBe('up');
  });

  it('returns unhealthy when database is down', async () => {
    (checkDatabaseHealth as jest.Mock).mockResolvedValue({ healthy: false, error: 'Connection refused' });

    const req = new NextRequest('http://localhost:3000/api/health');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.status).toBe('unhealthy');
    expect(json.checks.database.status).toBe('down');
  });

  it('returns degraded when database is slow', async () => {
    (checkDatabaseHealth as jest.Mock).mockResolvedValue({ healthy: true, latency: 800 });

    const req = new NextRequest('http://localhost:3000/api/health');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.status).toBe('degraded');
    expect(json.checks.database.status).toBe('degraded');
  });

  it('includes uptime and timestamp in response', async () => {
    (checkDatabaseHealth as jest.Mock).mockResolvedValue({ healthy: true, latency: 5 });

    const req = new NextRequest('http://localhost:3000/api/health');
    const res = await GET(req);
    const json = await res.json();

    expect(json.timestamp).toBeDefined();
    expect(typeof json.uptime).toBe('number');
  });
});
