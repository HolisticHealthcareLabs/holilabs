/**
 * Tests for POST /api/portal/auth/logout
 *
 * Logout patient and clear session:
 * - Happy path → 200 with success
 * - Session clear error → 500
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
  logger: {
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
  clearPatientSession: jest.fn(),
  getPatientSession: jest.fn(),
  createPatientSession: jest.fn(),
  getCurrentPatient: jest.fn(),
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue({ id: 'audit-1' }),
  auditView: jest.fn(),
  auditCreate: jest.fn(),
}));

const { POST } = require('../route');
const { clearPatientSession } = require('@/lib/auth/patient-session');

describe('POST /api/portal/auth/logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs out successfully', async () => {
    (clearPatientSession as jest.Mock).mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost:3000/api/portal/auth/logout', {
      method: 'POST',
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Logged out successfully');
    expect(clearPatientSession).toHaveBeenCalled();
  });

  it('returns 500 when session clear fails', async () => {
    (clearPatientSession as jest.Mock).mockRejectedValue(new Error('Redis connection failed'));

    const req = new NextRequest('http://localhost:3000/api/portal/auth/logout', {
      method: 'POST',
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Failed to logout');
  });
});
