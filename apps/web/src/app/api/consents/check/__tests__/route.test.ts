/**
 * GET /api/consents/check - Consent status check tests
 *
 * Tests: GET checks consent status for authenticated user.
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/auth', () => ({
  getServerSession: jest.fn(),
  authOptions: {},
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patientUser: {
      findUnique: jest.fn(),
    },
  },
}));

const { GET } = require('../route');
const { getServerSession } = require('@/lib/auth');
const { prisma } = require('@/lib/prisma');

const mockSession = {
  user: {
    id: 'user-1',
    email: 'patient@example.com',
  },
};

const mockContext = {
  user: { id: 'user-1', email: 'patient@example.com' },
  requestId: 'req-1',
};

const mockPatientUser = {
  id: 'pu-1',
  email: 'patient@example.com',
  patient: {
    id: 'patient-1',
    consents: [
      {
        type: 'TERMS_OF_SERVICE',
        title: 'Terms',
        version: '1.0',
        signedAt: new Date('2025-01-15'),
      },
      {
        type: 'PRIVACY_POLICY',
        title: 'Privacy',
        version: '1.0',
        signedAt: new Date('2025-01-15'),
      },
    ],
  },
};

describe('GET /api/consents/check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
  });

  it('returns consent status when all required consents accepted', async () => {
    (prisma.patientUser.findUnique as jest.Mock).mockResolvedValue(mockPatientUser);

    const request = new NextRequest('http://localhost:3000/api/consents/check');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.allAccepted).toBeDefined();
    expect(data.missingConsents).toBeDefined();
    expect(data.consents).toBeDefined();
    expect(Array.isArray(data.consents)).toBe(true);
    expect(prisma.patientUser.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: 'patient@example.com' },
      })
    );
  });

  it('returns missing consents when patient has no consents', async () => {
    (prisma.patientUser.findUnique as jest.Mock).mockResolvedValue({
      ...mockPatientUser,
      patient: { ...mockPatientUser.patient, consents: [] },
    });

    const request = new NextRequest('http://localhost:3000/api/consents/check');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.allAccepted).toBe(false);
    expect(data.missingConsents.length).toBeGreaterThan(0);
  });
});
