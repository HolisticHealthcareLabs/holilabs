/**
 * Tests for POST /api/command-center/events
 *
 * - POST stores events when authenticated with valid Bearer token
 * - POST returns 401 when no Bearer token is provided
 * - POST returns 401 when token does not match any API key
 * - POST returns 400 when events array is empty or missing
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
    agentDevice: { findMany: jest.fn() },
    fleetEvent: { createMany: jest.fn() },
  },
}));

const { _prisma } = require('@/lib/prisma');
const { POST } = require('../route');

describe('POST /api/command-center/events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (_prisma.workspaceAPIKey.findFirst as jest.Mock).mockResolvedValue({
      id: 'key-1',
      workspaceId: 'ws-1',
    });
    (_prisma.workspaceAPIKey.update as jest.Mock).mockResolvedValue({});
    (_prisma.agentDevice.findMany as jest.Mock).mockResolvedValue([]);
    (_prisma.fleetEvent.createMany as jest.Mock).mockResolvedValue({ count: 1 });
  });

  it('stores fleet events when authenticated with valid Bearer token', async () => {
    const request = new NextRequest('http://localhost:3000/api/command-center/events', {
      method: 'POST',
      body: JSON.stringify({
        events: [
          { eventType: 'HARD_BRAKE', deviceId: 'dev-1', ruleId: 'rule-123', latencyMs: 50 },
        ],
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
    expect(_prisma.fleetEvent.createMany).toHaveBeenCalled();
  });

  it('returns 401 when no Bearer token is provided', async () => {
    const request = new NextRequest('http://localhost:3000/api/command-center/events', {
      method: 'POST',
      body: JSON.stringify({ events: [{ eventType: 'INFO' }] }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 401 when token hash does not match any API key', async () => {
    (_prisma.workspaceAPIKey.findFirst as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/command-center/events', {
      method: 'POST',
      body: JSON.stringify({ events: [{ eventType: 'INFO' }] }),
      headers: { Authorization: 'Bearer hl_ws_invalidtoken' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
  });

  it('returns 400 when events array is empty', async () => {
    const request = new NextRequest('http://localhost:3000/api/command-center/events', {
      method: 'POST',
      body: JSON.stringify({ events: [] }),
      headers: { Authorization: 'Bearer hl_ws_validtoken' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid payload');
  });
});
