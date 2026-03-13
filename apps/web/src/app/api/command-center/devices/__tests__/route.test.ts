/**
 * Tests for GET /api/command-center/devices
 *
 * - GET returns list of active devices with online/offline status
 * - GET marks devices with recent heartbeat as online
 * - GET returns empty array when DB is unavailable
 * - GET respects the limit query parameter
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
    agentDevice: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/workspace', () => ({
  getOrCreateWorkspaceForUser: jest.fn(),
}));

const { _prisma } = require('@/lib/prisma');
const { getOrCreateWorkspaceForUser } = require('@/lib/workspace');
const { GET } = require('../route');

const mockContext = {
  user: { id: 'admin-1', email: 'admin@holilabs.com', role: 'ADMIN' },
  requestId: 'req-1',
};

const recentHeartbeat = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes ago = online
const staleHeartbeat = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago = offline

describe('GET /api/command-center/devices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getOrCreateWorkspaceForUser as jest.Mock).mockResolvedValue({ workspaceId: 'ws-1' });
    (_prisma.agentDevice.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'dev-1',
        deviceId: 'mac-abc123',
        deviceType: 'DESKTOP_MAC',
        hostname: 'dev-machine',
        os: 'macOS 14',
        lastHeartbeatAt: recentHeartbeat,
        firstSeenAt: new Date(),
        sidecarVersion: '1.2.0',
        edgeVersion: null,
        rulesetVersion: 'v1',
      },
      {
        id: 'dev-2',
        deviceId: 'win-xyz456',
        deviceType: 'DESKTOP_WINDOWS',
        hostname: 'office-pc',
        os: 'Windows 11',
        lastHeartbeatAt: staleHeartbeat,
        firstSeenAt: new Date(),
        sidecarVersion: '1.1.0',
        edgeVersion: null,
        rulesetVersion: 'v1',
      },
    ]);
  });

  it('returns list of active devices with online/offline status', async () => {
    const request = new NextRequest('http://localhost:3000/api/command-center/devices');

    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeInstanceOf(Array);
    expect(data.data).toHaveLength(2);
  });

  it('marks devices with recent heartbeat as online and stale as offline', async () => {
    const request = new NextRequest('http://localhost:3000/api/command-center/devices');

    const response = await GET(request, mockContext);
    const data = await response.json();

    const online = data.data.find((d: any) => d.deviceId === 'mac-abc123');
    const offline = data.data.find((d: any) => d.deviceId === 'win-xyz456');

    expect(online.status).toBe('online');
    expect(offline.status).toBe('offline');
  });

  it('returns empty array when _prisma is null', async () => {
    const originalMock = jest.requireMock('@/lib/prisma');
    originalMock._prisma = null;

    const request = new NextRequest('http://localhost:3000/api/command-center/devices');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual([]);

    originalMock._prisma = {
      agentDevice: { findMany: jest.fn() },
    };
  });

  it('passes limit query parameter to database query', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/command-center/devices?limit=10'
    );

    await GET(request, mockContext);

    expect(_prisma.agentDevice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 })
    );
  });
});
