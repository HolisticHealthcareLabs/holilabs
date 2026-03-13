/**
 * Tests for POST /api/portal/auth/magic-link/send
 *
 * Send magic link to patient email:
 * - Happy path → 200 (user found, email sent)
 * - User not found → 200 (opaque response for security)
 * - Invalid email → 400
 * - Missing email → 400
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
    patientUser: {
      findUnique: jest.fn(),
    },
    magicLink: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue({ id: 'audit-1' }),
  auditView: jest.fn(),
  auditCreate: jest.fn(),
}));

jest.mock('@/lib/email', () => ({
  sendMagicLinkEmail: jest.fn().mockResolvedValue({ success: true }),
  sendEmailVerificationEmail: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn((msg: string, status: number) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: msg }, { status });
  }),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const MOCK_PATIENT_USER = {
  id: 'pu-1',
  email: 'jane@example.com',
  patient: {
    id: 'patient-1',
    firstName: 'Jane',
    lastName: 'Doe',
  },
};

function makeRequest(body: object): NextRequest {
  return new NextRequest('http://localhost:3000/api/portal/auth/magic-link/send', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/portal/auth/magic-link/send', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends magic link for existing user', async () => {
    (prisma.patientUser.findUnique as jest.Mock).mockResolvedValue(MOCK_PATIENT_USER);
    (prisma.magicLink.create as jest.Mock).mockResolvedValue({ id: 'ml-1' });

    const req = makeRequest({ email: 'jane@example.com' });
    const res = await POST(req, {});
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.magicLink.create).toHaveBeenCalled();
  });

  it('returns 200 with opaque message when user not found (security)', async () => {
    (prisma.patientUser.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makeRequest({ email: 'unknown@example.com' });
    const res = await POST(req, {});
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('If an account exists');
    expect(prisma.magicLink.create).not.toHaveBeenCalled();
  });

  it('returns 400 for missing email', async () => {
    const req = makeRequest({});
    const res = await POST(req, {});
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('email');
  });

  it('returns 400 for invalid email format', async () => {
    const req = makeRequest({ email: 'not-valid' });
    const res = await POST(req, {});
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('email');
  });
});
