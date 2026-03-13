/**
 * Tests for POST /api/portal/auth/otp/verify
 *
 * Verify OTP code:
 * - Happy path → 200 with patient data (SMS)
 * - Missing code → 400
 * - Missing phone/email → 400
 * - Invalid code → 401
 * - Already used code → 401
 * - Expired code → 401
 * - Max attempts exceeded → 401
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
    oTPCode: {
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

jest.mock('@/lib/analytics/server-analytics', () => ({
  trackEvent: jest.fn().mockResolvedValue(undefined),
  ServerAnalyticsEvents: {
    OTP_VERIFIED: 'otp_verified',
  },
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const MOCK_OTP_RECORD = {
  id: 'otp-1',
  codeHash: 'hashed-code',
  usedAt: null,
  expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  attempts: 0,
  maxAttempts: 5,
  sentVia: 'SMS',
  recipientPhone: '+5511999999999',
  recipientEmail: null,
  patientUser: {
    id: 'pu-1',
    patient: {
      id: 'patient-1',
      firstName: 'Jane',
      lastName: 'Doe',
    },
  },
};

function makeRequest(body: object): NextRequest {
  return new NextRequest('http://localhost:3000/api/portal/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/portal/auth/otp/verify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('verifies valid OTP code with phone match', async () => {
    (prisma.oTPCode.findUnique as jest.Mock).mockResolvedValue(MOCK_OTP_RECORD);
    (prisma.oTPCode.update as jest.Mock).mockResolvedValue({ ...MOCK_OTP_RECORD, usedAt: new Date() });
    (prisma.patientUser.update as jest.Mock).mockResolvedValue({ id: 'pu-1' });

    const req = makeRequest({ code: '123456', phone: '+5511999999999' });
    const res = await POST(req, {});
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.patient.id).toBe('patient-1');
    expect(data.patient.firstName).toBe('Jane');
    expect(prisma.oTPCode.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'otp-1' },
        data: expect.objectContaining({ usedAt: expect.any(Date) }),
      })
    );
  });

  it('returns 400 when code is missing', async () => {
    const req = makeRequest({ phone: '+5511999999999' });
    const res = await POST(req, {});
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Verification code is required');
  });

  it('returns 400 when both phone and email are missing', async () => {
    const req = makeRequest({ code: '123456' });
    const res = await POST(req, {});
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Phone number or email is required');
  });

  it('returns 401 for invalid OTP code', async () => {
    (prisma.oTPCode.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makeRequest({ code: '000000', phone: '+5511999999999' });
    const res = await POST(req, {});
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('Invalid verification code');
  });

  it('returns 401 for already used code', async () => {
    (prisma.oTPCode.findUnique as jest.Mock).mockResolvedValue({
      ...MOCK_OTP_RECORD,
      usedAt: new Date('2025-01-01'),
    });

    const req = makeRequest({ code: '123456', phone: '+5511999999999' });
    const res = await POST(req, {});
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('Verification code has already been used');
  });

  it('returns 401 for expired code', async () => {
    (prisma.oTPCode.findUnique as jest.Mock).mockResolvedValue({
      ...MOCK_OTP_RECORD,
      expiresAt: new Date('2020-01-01'),
    });

    const req = makeRequest({ code: '123456', phone: '+5511999999999' });
    const res = await POST(req, {});
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('Verification code has expired');
  });

  it('returns 401 when max attempts exceeded', async () => {
    (prisma.oTPCode.findUnique as jest.Mock).mockResolvedValue({
      ...MOCK_OTP_RECORD,
      attempts: 5,
    });

    const req = makeRequest({ code: '123456', phone: '+5511999999999' });
    const res = await POST(req, {});
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toContain('Maximum verification attempts');
  });
});
