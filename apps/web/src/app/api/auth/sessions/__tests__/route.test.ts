import { NextRequest } from 'next/server';

const mockSessionService = {
  getUserSessions: jest.fn(),
  terminateSession: jest.fn(),
  terminateAllUserSessions: jest.fn(),
};

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/auth/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth/session-tracking', () => ({
  getSessionTrackingService: jest.fn(() => mockSessionService),
}));

jest.mock('@/lib/auth/token-revocation', () => ({
  getTokenRevocationService: jest.fn(),
  RevocationReason: { LOGOUT: 'LOGOUT' },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET, DELETE } = require('../route');
const { auth } = require('@/lib/auth/auth');
const { getSessionTrackingService } = require('@/lib/auth/session-tracking');

describe('GET /api/auth/sessions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSessionTrackingService as jest.Mock).mockReturnValue(mockSessionService);
    mockSessionService.getUserSessions.mockResolvedValue([
      {
        sessionId: 's1',
        userAgent: 'Mozilla/5.0',
        ipAddress: '127.0.0.1',
        deviceFingerprint: 'abcdef1234567890',
        createdAt: new Date(),
        lastActivityAt: new Date(),
        expiresAt: new Date(),
      },
    ]);
    mockSessionService.terminateSession.mockResolvedValue(undefined);
    mockSessionService.terminateAllUserSessions.mockResolvedValue(3);
  });

  it('returns user sessions when authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'u1' } });

    const req = new NextRequest('http://localhost:3000/api/auth/sessions');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.sessions).toHaveLength(1);
    expect(json.sessions[0].sessionId).toBe('s1');
  });

  it('returns 401 when not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    const { getServerSession } = require('@/lib/auth');
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/auth/sessions');
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('truncates device fingerprint in response', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'u1' } });

    const req = new NextRequest('http://localhost:3000/api/auth/sessions');
    const res = await GET(req);
    const json = await res.json();

    expect(json.sessions[0].deviceInfo.fingerprint).toBe('abcdef12...');
  });
});

describe('DELETE /api/auth/sessions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSessionTrackingService as jest.Mock).mockReturnValue(mockSessionService);
    mockSessionService.terminateAllUserSessions.mockResolvedValue(3);
  });

  it('terminates all sessions when no sessionId', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'u1' } });

    const req = new NextRequest('http://localhost:3000/api/auth/sessions');
    const res = await DELETE(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.count).toBe(3);
  });
});
