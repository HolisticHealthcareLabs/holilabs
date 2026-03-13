import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '../middleware';

// Stable mock references that survive jest resetMocks
const mockFindFirst = jest.fn();
const mockFindUnique = jest.fn();
const mockWorkspaceFindUnique = jest.fn();
const mockGetPatientSession = jest.fn();
const mockGetOrCreateWorkspace = jest.fn();
const mockLogError = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: (...args: any[]) => mockFindFirst(...args),
      findUnique: (...args: any[]) => mockFindUnique(...args),
    },
    workspace: {
      findUnique: (...args: any[]) => mockWorkspaceFindUnique(...args),
    },
  },
}));

jest.mock('@/lib/auth/patient-session', () => ({
  getPatientSession: (...args: any[]) => mockGetPatientSession(...args),
}));

jest.mock('@/lib/workspace', () => ({
  getOrCreateWorkspaceForUser: (...args: any[]) => mockGetOrCreateWorkspace(...args),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
  logError: (...args: any[]) => mockLogError(...args),
}));

describe('Middleware Authentication (requireAuth)', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindFirst.mockReset();
    mockFindUnique.mockReset();
    mockWorkspaceFindUnique.mockResolvedValue({ id: 'ws-test', name: 'Test Workspace' });
    mockGetPatientSession.mockResolvedValue(null);
    mockGetOrCreateWorkspace.mockResolvedValue({ workspaceId: 'ws-test', role: 'MEMBER' });
    mockLogError.mockImplementation((err: unknown) => ({ err: err instanceof Error ? err : new Error(String(err)) }));

    process.env.TEST_ENV = 'true';
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });

    (global as any)._mockSession = null;
  });

  afterEach(() => {
    delete process.env.TEST_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
  });

  it('should reject request with expired JWT / missing session (401 response)', async () => {
    (global as any)._mockSession = null;

    const req = new NextRequest('http://localhost/api/protected');
    const context: any = { requestId: 'test-req-id' };
    const nextFn = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));

    const middleware = requireAuth();
    const response = await middleware(req, context, nextFn);

    expect(nextFn).not.toHaveBeenCalled();
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe('Authentication required');
  });

  it('should reject request with valid JWT but missing user from DB (401 response)', async () => {
    (global as any)._mockSession = {
      user: {
        id: 'deleted-user-id',
        email: 'deleted@example.com'
      }
    };

    mockFindUnique.mockResolvedValueOnce(null);

    const req = new NextRequest('http://localhost/api/protected');
    const context: any = { requestId: 'test-req-id' };
    const nextFn = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));

    const middleware = requireAuth();
    const response = await middleware(req, context, nextFn);

    expect(nextFn).not.toHaveBeenCalled();
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe('User not found');
  });

  it('should accept request with valid session and existing DB user', async () => {
    (global as any)._mockSession = {
      user: {
        id: 'valid-user-id',
        email: 'valid@example.com'
      }
    };

    mockFindUnique.mockResolvedValueOnce({
      id: 'valid-user-id',
      email: 'valid@example.com',
      role: 'CLINICIAN',
      firstName: 'Test',
      lastName: 'User'
    });

    const req = new NextRequest('http://localhost/api/protected');
    const context: any = { requestId: 'test-req-id' };
    const nextFn = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));

    const middleware = requireAuth();
    const response = await middleware(req, context, nextFn);

    expect(nextFn).toHaveBeenCalled();
    expect(context.user).toBeDefined();
    expect(context.user.id).toBe('valid-user-id');
    expect(context.user.role).toBe('CLINICIAN');
  });

  it('should handle internal agent gateway authentication', async () => {
    process.env.NEXTAUTH_SECRET = 'test-secret';

    const crypto = require('crypto');
    const now = Math.floor(Date.now() / 60000);
    const validInternalToken = crypto
      .createHmac('sha256', 'test-secret')
      .update(`agent-internal:${now}`)
      .digest('hex');

    (global as any)._mockSession = null;

    mockFindFirst.mockResolvedValueOnce({
      id: 'agent-user-id',
      email: 'agent@example.com',
      role: 'ADMIN',
    });

    const req = new NextRequest('http://localhost/api/protected', {
      headers: new Headers({
        'X-Agent-Internal-Token': validInternalToken,
        'X-Agent-User-Id': 'agent-user-id',
        'X-Agent-User-Email': 'agent@example.com'
      })
    });

    const context: any = { requestId: 'test-req-id' };
    const nextFn = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));

    const middleware = requireAuth();
    await middleware(req, context, nextFn);

    expect(nextFn).toHaveBeenCalled();
    expect(context.user).toBeDefined();
    expect(context.user.id).toBe('agent-user-id');
    expect(context.user.role).toBe('ADMIN');
  });
});
