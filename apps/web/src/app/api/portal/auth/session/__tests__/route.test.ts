/**
 * Tests for GET /api/portal/auth/session
 *
 * Returns current patient session with patient data:
 * - Happy path → 200 with session + patient
 * - No active session → 401
 * - Patient not found → 404
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
  getPatientSession: jest.fn(),
  getCurrentPatient: jest.fn(),
  createPatientSession: jest.fn(),
  clearPatientSession: jest.fn(),
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue({ id: 'audit-1' }),
  auditView: jest.fn(),
  auditCreate: jest.fn(),
}));

const { GET } = require('../route');
const { getPatientSession, getCurrentPatient } = require('@/lib/auth/patient-session');

describe('GET /api/portal/auth/session', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns session and patient data when authenticated', async () => {
    const mockSession = {
      patientUserId: 'pu-1',
      patientId: 'patient-1',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };

    const mockPatientUser = {
      id: 'pu-1',
      email: 'jane@example.com',
      patient: {
        id: 'patient-1',
        mrn: 'MRN-001',
        firstName: 'Jane',
        lastName: 'Doe',
        dateOfBirth: '1990-05-15',
        gender: 'F',
        email: 'jane@example.com',
        phone: '+5511999999999',
      },
    };

    (getPatientSession as jest.Mock).mockResolvedValue(mockSession);
    (getCurrentPatient as jest.Mock).mockResolvedValue(mockPatientUser);

    const req = new NextRequest('http://localhost:3000/api/portal/auth/session');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.patient.id).toBe('patient-1');
    expect(data.patient.firstName).toBe('Jane');
    expect(data.session.email).toBe('jane@example.com');
  });

  it('returns 401 when no active session', async () => {
    (getPatientSession as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/portal/auth/session');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('No active session');
  });

  it('returns 404 when patient not found', async () => {
    const mockSession = {
      patientUserId: 'pu-1',
      patientId: 'patient-1',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };

    (getPatientSession as jest.Mock).mockResolvedValue(mockSession);
    (getCurrentPatient as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/portal/auth/session');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Patient not found');
  });
});
