import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));
jest.mock('@/lib/logger', () => ({ __esModule: true, default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('@/lib/audit', () => ({ createAuditLog: jest.fn().mockResolvedValue({ id: 'a1' }), auditView: jest.fn(), auditCreate: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    workspaceMember: { findFirst: jest.fn() },
  },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'user-1', email: 'dr@test.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('GET /api/user/workspace', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns workspaceName when user has a workspace membership', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue({
      userId: 'user-1',
      workspace: { name: 'Clinic Alpha' },
    });
    const req = new NextRequest('http://localhost:3000/api/user/workspace');
    const res = await GET(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.workspaceName).toBe('Clinic Alpha');
  });

  it('returns null workspaceName when user has no membership', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/user/workspace');
    const res = await GET(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.workspaceName).toBeNull();
  });

  it('returns null workspaceName when membership has no workspace', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue({ userId: 'user-1', workspace: null });
    const req = new NextRequest('http://localhost:3000/api/user/workspace');
    const res = await GET(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.workspaceName).toBeNull();
  });
});
