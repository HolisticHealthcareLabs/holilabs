import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patientUser: { findUnique: jest.fn(), update: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn(),
}));

jest.mock('bcryptjs', () => ({ compare: jest.fn() }));
jest.mock('@/lib/auth/patient-session', () => ({ createPatientSession: jest.fn() }));
jest.mock('@/lib/audit', () => ({ createAuditLog: jest.fn() }));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const bcrypt = require('bcryptjs');

const mockPatientUser = {
  id: 'pu-1',
  email: 'patient@test.com',
  passwordHash: 'hashed-pw',
  loginAttempts: 0,
  lockedUntil: null,
  emailVerifiedAt: new Date(),
  patient: { id: 'pat-1', firstName: 'Jane', lastName: 'Doe', mrn: 'MRN-001' },
};

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/portal/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/portal/auth/login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with patient data on valid credentials', async () => {
    (prisma.patientUser.findUnique as jest.Mock).mockResolvedValue(mockPatientUser);
    (prisma.patientUser.update as jest.Mock).mockResolvedValue({});
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const res = await POST(makeRequest({ email: 'patient@test.com', password: 'secret' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.patient.id).toBe('pat-1');
    expect(data.patient.firstName).toBe('Jane');
  });

  it('returns 400 when email or password is missing', async () => {
    const res = await POST(makeRequest({ email: 'patient@test.com' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('required');
  });

  it('returns 401 when user not found', async () => {
    (prisma.patientUser.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await POST(makeRequest({ email: 'nobody@test.com', password: 'secret' }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('Invalid email or password');
  });
});
