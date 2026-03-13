/**
 * Tests for GET /api/portal/auth/whoami
 *
 * Returns current patient session:
 * - Happy path → 200 with session and token
 * - No session → 200 with session: null
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {},
}));

jest.mock('@/lib/auth/patient-session', () => ({
  getPatientSession: jest.fn(),
  createPatientSession: jest.fn(),
  clearPatientSession: jest.fn(),
  getCurrentPatient: jest.fn(),
}));

jest.mock('next/headers', () => {
  const mockGet = jest.fn().mockReturnValue({ value: 'jwt-token-abc' });
  return {
    cookies: () => ({ get: mockGet }),
  };
});

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue({ id: 'audit-1' }),
  auditView: jest.fn(),
  auditCreate: jest.fn(),
}));

const { GET } = require('../route');
const { getPatientSession } = require('@/lib/auth/patient-session');

describe('GET /api/portal/auth/whoami', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns session and token when authenticated', async () => {
    const mockSession = {
      patientUserId: 'pu-1',
      patientId: 'patient-1',
      email: 'jane@example.com',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };

    (getPatientSession as jest.Mock).mockResolvedValue(mockSession);

    const req = new NextRequest('http://localhost:3000/api/portal/auth/whoami');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.session).toEqual(mockSession);
    expect(data).toHaveProperty('token');
  });

  it('returns null session when not authenticated', async () => {
    (getPatientSession as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/portal/auth/whoami');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.session).toBeNull();
  });
});
