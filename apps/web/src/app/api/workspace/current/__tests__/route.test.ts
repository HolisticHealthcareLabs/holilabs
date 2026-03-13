import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));
jest.mock('@/lib/logger', () => ({ __esModule: true, default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('@/lib/auth', () => ({
  getServerSession: jest.fn(),
  authOptions: {},
}));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    workspace: { findUnique: jest.fn() },
  },
}));

const { GET } = require('../route');
const { getServerSession } = require('@/lib/auth');
const { prisma } = require('@/lib/prisma');

describe('GET /api/workspace/current', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns demo payload when no session exists', async () => {
    getServerSession.mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/workspace/current');
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.workspaceId).toBe('demo-workspace-1');
    expect(data.role).toBe('CLINICIAN');
  });

  it('returns session workspace when authenticated', async () => {
    getServerSession.mockResolvedValue({
      user: { id: 'user-1', workspaceId: 'ws-123', role: 'PHYSICIAN' },
    });
    prisma.workspace.findUnique.mockResolvedValue({ isEphemeral: false, metadata: null, name: 'My Clinic', expiresAt: null });
    const req = new NextRequest('http://localhost:3000/api/workspace/current');
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.workspaceId).toBe('ws-123');
    expect(data.role).toBe('PHYSICIAN');
  });

  it('returns ephemeral metadata when workspace is ephemeral', async () => {
    getServerSession.mockResolvedValue({
      user: { id: 'user-1', workspaceId: 'ws-ephemeral', role: 'CLINICIAN' },
    });
    prisma.workspace.findUnique.mockResolvedValue({
      isEphemeral: true,
      metadata: { specialty: 'cardiology' },
      name: 'Demo Workspace',
      expiresAt: new Date('2026-12-31'),
    });
    const req = new NextRequest('http://localhost:3000/api/workspace/current');
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.isEphemeral).toBe(true);
    expect(data.metadata).toEqual({ specialty: 'cardiology' });
  });

  it('falls back to demo payload when session lookup throws', async () => {
    getServerSession.mockRejectedValue(new Error('Session error'));
    const req = new NextRequest('http://localhost:3000/api/workspace/current');
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.workspaceId).toBe('demo-workspace-1');
  });
});
