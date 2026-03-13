/**
 * Tests for POST /api/portal/auth/register
 *
 * Patient registration:
 * - Happy path → 201 with patient record
 * - Missing required fields → 400
 * - Invalid email → 400
 * - Weak password → 400
 * - Duplicate email → 409
 * - Invalid date of birth → 400
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
      create: jest.fn(),
    },
    patient: {
      create: jest.fn(),
      update: jest.fn(),
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

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password-123'),
}));

jest.mock('@/lib/email', () => ({
  sendEmailVerificationEmail: jest.fn().mockResolvedValue({ success: true }),
  sendMagicLinkEmail: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/lib/auth/password-validation', () => ({
  validatePassword: jest.fn().mockReturnValue({ valid: true, errors: [] }),
}));

jest.mock('@/lib/blockchain/hashing', () => ({
  generatePatientDataHash: jest.fn().mockReturnValue('mock-hash-abc123'),
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn((msg: string, status: number) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: msg }, { status });
  }),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { validatePassword } = require('@/lib/auth/password-validation');

function makeRequest(body: object): NextRequest {
  return new NextRequest('http://localhost:3000/api/portal/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const VALID_BODY = {
  email: 'jane@example.com',
  password: 'StrongP@ss1!',
  firstName: 'Jane',
  lastName: 'Doe',
  dateOfBirth: '1990-05-15',
  phone: '+5511999999999',
};

describe('POST /api/portal/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (validatePassword as jest.Mock).mockReturnValue({ valid: true, errors: [] });
  });

  it('registers a new patient successfully', async () => {
    const mockPatient = {
      id: 'patient-new',
      firstName: 'Jane',
      lastName: 'Doe',
      mrn: 'MRN-TEST-01',
    };
    const mockPatientUser = {
      id: 'pu-new',
      email: 'jane@example.com',
      patientId: 'patient-new',
    };

    (prisma.patientUser.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.patient.create as jest.Mock).mockResolvedValue(mockPatient);
    (prisma.patient.update as jest.Mock).mockResolvedValue(mockPatient);
    (prisma.patientUser.create as jest.Mock).mockResolvedValue(mockPatientUser);
    (prisma.magicLink.create as jest.Mock).mockResolvedValue({ id: 'ml-1' });

    const req = makeRequest(VALID_BODY);
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.patient.id).toBe('patient-new');
    expect(data.patient.firstName).toBe('Jane');
    expect(prisma.patient.create).toHaveBeenCalled();
    expect(prisma.patientUser.create).toHaveBeenCalled();
  });

  it('returns 400 for missing required fields', async () => {
    const req = makeRequest({ email: 'jane@example.com' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Missing required fields');
    expect(data.required).toContain('password');
    expect(prisma.patientUser.findUnique).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid email format', async () => {
    const req = makeRequest({ ...VALID_BODY, email: 'not-an-email' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid email format');
  });

  it('returns 400 for weak password', async () => {
    (validatePassword as jest.Mock).mockReturnValue({
      valid: false,
      errors: ['Password must be at least 8 characters'],
    });

    const req = makeRequest({ ...VALID_BODY, password: '123' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Password does not meet security requirements');
    expect(data.requirements).toContain('Password must be at least 8 characters');
  });

  it('returns 409 for duplicate email', async () => {
    (prisma.patientUser.findUnique as jest.Mock).mockResolvedValue({
      id: 'existing-pu',
      email: 'jane@example.com',
    });

    const req = makeRequest(VALID_BODY);
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toContain('already exists');
  });

  it('returns 400 for invalid date of birth', async () => {
    (prisma.patientUser.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makeRequest({ ...VALID_BODY, dateOfBirth: 'not-a-date' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid date of birth format');
  });
});
