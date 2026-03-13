import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  _prisma: {
    agentDevice: { count: jest.fn(), findMany: jest.fn() },
    fleetEvent: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/workspace', () => ({
  getOrCreateWorkspaceForUser: jest.fn(),
}));

const { GET } = require('../route');
const { _prisma } = require('@/lib/prisma');
const { getOrCreateWorkspaceForUser } = require('@/lib/workspace');

const ctx = { user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' } };

describe('GET /api/command-center/overview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getOrCreateWorkspaceForUser as jest.Mock).mockResolvedValue({ workspaceId: 'ws-1' });
  });

  it('returns fleet, policy, and outcomes data', async () => {
    (_prisma.agentDevice.count as jest.Mock)
      .mockResolvedValueOnce(10)   // totalDevices
      .mockResolvedValueOnce(7)    // onlineDevices
      .mockResolvedValueOnce(2);   // last24hNewDevices

    (_prisma.agentDevice.findMany as jest.Mock).mockResolvedValue([
      { permissions: { screenRecording: 'granted', accessibility: 'granted' }, rulesetVersion: 'v0 (local)' },
    ]);

    (_prisma.fleetEvent.findMany as jest.Mock).mockResolvedValue([
      { eventType: 'HARD_BRAKE', latencyMs: 120 },
      { eventType: 'NUDGE', latencyMs: 80 },
    ]);

    const req = new NextRequest('http://localhost:3000/api/command-center/overview');
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.fleet.totalDevices).toBe(10);
    expect(json.fleet.onlineDevices).toBe(7);
    expect(json.fleet.offlineDevices).toBe(3);
    expect(json.outcomes.interventions24h).toBe(2);
  });

  it('returns empty data when user id is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/command-center/overview');
    const res = await GET(req, { user: {} });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
  });
});
