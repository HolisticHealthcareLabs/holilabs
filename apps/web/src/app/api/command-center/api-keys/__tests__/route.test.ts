/**
 * Tests for GET/POST /api/command-center/api-keys
 *
 * - GET returns list of active API keys for workspace admin
 * - GET returns 403 when user is not a workspace admin
 * - POST creates a new API key and returns plaintext token once
 * - POST returns 503 when DB is unavailable
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  _prisma: {
    workspaceAPIKey: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/workspace', () => ({
  requireWorkspaceAdmin: jest.fn(),
}));

const { _prisma } = require('@/lib/prisma');
const { requireWorkspaceAdmin } = require('@/lib/workspace');
const { GET, POST } = require('../route');

const mockContext = {
  user: { id: 'admin-1', email: 'admin@holilabs.com', role: 'ADMIN' },
  requestId: 'req-1',
};

describe('GET /api/command-center/api-keys', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireWorkspaceAdmin as jest.Mock).mockResolvedValue({ workspaceId: 'ws-1' });
    (_prisma.workspaceAPIKey.findMany as jest.Mock).mockResolvedValue([
      { id: 'key-1', name: 'Agent key', createdAt: new Date(), lastUsedAt: null },
    ]);
  });

  it('returns list of active API keys for workspace admin', async () => {
    const request = new NextRequest('http://localhost:3000/api/command-center/api-keys');

    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data[0]).toHaveProperty('id');
    expect(data.data[0]).toHaveProperty('name');
    expect(data.data[0]).not.toHaveProperty('tokenHash');
  });

  it('returns 403 when user is not a workspace admin', async () => {
    (requireWorkspaceAdmin as jest.Mock).mockRejectedValue(new Error('Forbidden'));

    const request = new NextRequest('http://localhost:3000/api/command-center/api-keys');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('returns 503 when DB is unavailable', async () => {
    const originalPrisma = require('@/lib/prisma')._prisma;
    jest.resetModules();

    jest.mock('@/lib/prisma', () => ({ _prisma: null }));
    const { GET: getWithNullDb } = require('../route');
    const request = new NextRequest('http://localhost:3000/api/command-center/api-keys');
    const response = await getWithNullDb(request, mockContext);

    expect(response.status).toBe(503);
  });
});

describe('POST /api/command-center/api-keys', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireWorkspaceAdmin as jest.Mock).mockResolvedValue({ workspaceId: 'ws-1' });
    (_prisma.workspaceAPIKey.create as jest.Mock).mockResolvedValue({
      id: 'key-new',
      name: 'My Agent',
      createdAt: new Date(),
    });
  });

  it('creates a new API key and returns plaintext token', async () => {
    const request = new NextRequest('http://localhost:3000/api/command-center/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name: 'My Agent' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.token).toMatch(/^hl_ws_/);
    expect(data.note).toContain('cannot be retrieved again');
    expect(data.data).toHaveProperty('id');
  });

  it('uses default name "Agent key" when no name is provided', async () => {
    const request = new NextRequest('http://localhost:3000/api/command-center/api-keys', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });

    await POST(request, mockContext);

    expect(_prisma.workspaceAPIKey.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Agent key' }),
      })
    );
  });
});
