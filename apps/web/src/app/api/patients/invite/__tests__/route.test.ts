/**
 * POST /api/patients/invite - Patient portal invite tests
 *
 * Tests: POST sends patient portal invite, rejects missing/invalid input.
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/lib/sms', () => ({
  sendSMS: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/logger', () => {
  const mock = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
  return { __esModule: true, default: mock, logger: mock };
});

jest.mock('jose', () => ({
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue('mock-invitation-token'),
  })),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: {
    id: 'clinician-1',
    email: 'dr@holilabs.com',
    role: 'CLINICIAN',
    organizationId: 'org-1',
  },
  requestId: 'req-1',
};

const mockPatient = {
  id: '11111111-1111-1111-1111-111111111111',
  firstName: 'Maria',
  lastName: 'Silva',
  email: 'maria@example.com',
  phone: '+5511999999999',
  assignedClinicianId: 'clinician-1',
  assignedClinician: {
    id: 'clinician-1',
    firstName: 'Dr',
    lastName: 'Test',
    email: 'dr@holilabs.com',
  },
};

describe('POST /api/patients/invite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
  });

  it('returns 404 when patient not found', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/patients/invite', {
      method: 'POST',
      body: JSON.stringify({
        patientId: '11111111-1111-1111-1111-111111111111',
        channels: ['email'],
      }),
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Patient not found');
    expect(prisma.patient.findUnique).toHaveBeenCalled();
  });

  it('rejects missing patientId', async () => {
    const request = new NextRequest('http://localhost:3000/api/patients/invite', {
      method: 'POST',
      body: JSON.stringify({
        channels: ['email'],
      }),
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Validation error');
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });

  it('rejects when patient has no email or phone', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({
      ...mockPatient,
      email: null,
      phone: null,
    });

    const request = new NextRequest('http://localhost:3000/api/patients/invite', {
      method: 'POST',
      body: JSON.stringify({
        patientId: '11111111-1111-1111-1111-111111111111',
        channels: ['email'],
      }),
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/Patient must have email or phone/i);
  });
});
