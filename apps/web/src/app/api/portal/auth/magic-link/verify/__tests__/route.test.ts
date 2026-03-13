/**
 * Tests for POST /api/portal/auth/magic-link/verify
 *
 * Verify magic link token and create session:
 * - Happy path → 200 with patient data
 * - Missing token → 400
 * - Invalid token → 401
 * - Already used token → 401
 * - Expired token → 401
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
  prisma: {
    magicLink: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    patientUser: {
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue({ id: 'audit-1' }),
  auditView: jest.fn(),
  auditCreate: jest.fn(),
}));

jest.mock('@/lib/auth/patient-session', () => ({
  createPatientSession: jest.fn().mockResolvedValue(undefined),
  getPatientSession: jest.fn(),
  clearPatientSession: jest.fn(),
  getCurrentPatient: jest.fn(),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const MOCK_MAGIC_LINK = {
  id: 'ml-1',
  tokenHash: 'hashed-token',
  usedAt: null,
  expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  patientUser: {
    id: 'pu-1',
    email: 'jane@example.com',
    emailVerifiedAt: null,
    patient: {
      id: 'patient-1',
      firstName: 'Jane',
      lastName: 'Doe',
      mrn: 'MRN-001',
    },
  },
};

function makeRequest(body: object): NextRequest {
  return new NextRequest('http://localhost:3000/api/portal/auth/magic-link/verify', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/portal/auth/magic-link/verify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('verifies valid magic link and returns patient', async () => {
    (prisma.magicLink.findUnique as jest.Mock).mockResolvedValue(MOCK_MAGIC_LINK);
    (prisma.magicLink.update as jest.Mock).mockResolvedValue({ ...MOCK_MAGIC_LINK, usedAt: new Date() });
    (prisma.patientUser.update as jest.Mock).mockResolvedValue({ id: 'pu-1' });

    const req = makeRequest({ token: 'valid-token-123' });
    const res = await POST(req, {});
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.patient.id).toBe('patient-1');
    expect(data.patient.firstName).toBe('Jane');
    expect(prisma.magicLink.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ml-1' },
        data: { usedAt: expect.any(Date) },
      })
    );
  });

  it('returns 400 when token is missing', async () => {
    const req = makeRequest({});
    const res = await POST(req, {});
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Token is required');
  });

  it('returns 401 for invalid token', async () => {
    (prisma.magicLink.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makeRequest({ token: 'invalid-token' });
    const res = await POST(req, {});
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('Invalid or expired magic link');
  });

  it('returns 401 for already used token', async () => {
    (prisma.magicLink.findUnique as jest.Mock).mockResolvedValue({
      ...MOCK_MAGIC_LINK,
      usedAt: new Date('2025-01-01'),
    });

    const req = makeRequest({ token: 'used-token' });
    const res = await POST(req, {});
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('Magic link has already been used');
  });

  it('returns 401 for expired token', async () => {
    (prisma.magicLink.findUnique as jest.Mock).mockResolvedValue({
      ...MOCK_MAGIC_LINK,
      expiresAt: new Date('2020-01-01'),
    });

    const req = makeRequest({ token: 'expired-token' });
    const res = await POST(req, {});
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('Magic link has expired');
  });
});
