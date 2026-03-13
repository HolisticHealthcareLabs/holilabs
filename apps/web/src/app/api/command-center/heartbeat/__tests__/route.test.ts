/**
 * Tests for POST /api/command-center/heartbeat
 *
 * - POST upserts device and creates heartbeat record for valid token + payload
 * - POST returns 401 when no Bearer token provided
 * - POST returns 400 when deviceId is missing or too short
 * - POST returns 503 when DB is unavailable
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  _prisma: {
    workspaceAPIKey: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    agentDevice: { upsert: jest.fn() },
    agentHeartbeat: { create: jest.fn() },
  },
}));

const { _prisma } = require('@/lib/prisma');
const { POST } = require('../route');

describe('POST /api/command-center/heartbeat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (_prisma.workspaceAPIKey.findFirst as jest.Mock).mockResolvedValue({
      id: 'key-1',
      workspaceId: 'ws-1',
    });
    (_prisma.workspaceAPIKey.update as jest.Mock).mockResolvedValue({});
    (_prisma.agentDevice.upsert as jest.Mock).mockResolvedValue({ id: 'device-db-1' });
    (_prisma.agentHeartbeat.create as jest.Mock).mockResolvedValue({});
  });

  it('upserts device and creates heartbeat for valid token and payload', async () => {
    const request = new NextRequest('http://localhost:3000/api/command-center/heartbeat', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: 'mac-abc-123',
        deviceType: 'DESKTOP_MAC',
        hostname: 'dev-laptop',
        os: 'macOS 14.2',
        sidecarVersion: '1.2.0',
        latencyMs: 42,
      }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer hl_ws_validtoken123',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(_prisma.agentDevice.upsert).toHaveBeenCalled();
    expect(_prisma.agentHeartbeat.create).toHaveBeenCalled();
  });

  it('returns 401 when no Bearer token is provided', async () => {
    const request = new NextRequest('http://localhost:3000/api/command-center/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ deviceId: 'mac-abc-123' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 when deviceId is missing or too short', async () => {
    const request = new NextRequest('http://localhost:3000/api/command-center/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ deviceId: 'ab' }), // too short (< 3)
      headers: { Authorization: 'Bearer hl_ws_validtoken' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid payload');
  });

  it('returns 503 when DB is unavailable', async () => {
    const originalPrisma = jest.requireMock('@/lib/prisma');
    originalPrisma._prisma = null;

    const request = new NextRequest('http://localhost:3000/api/command-center/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ deviceId: 'mac-abc-123' }),
      headers: { Authorization: 'Bearer hl_ws_validtoken' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe('DB unavailable');

    originalPrisma._prisma = {
      workspaceAPIKey: { findFirst: jest.fn(), update: jest.fn() },
      agentDevice: { upsert: jest.fn() },
      agentHeartbeat: { create: jest.fn() },
    };
  });
});
