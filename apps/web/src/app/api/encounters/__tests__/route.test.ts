/**
 * Tests for GET /api/encounters
 *
 * Lists clinical encounters for a patient:
 * - Happy path → 200 with encounter list
 * - Missing patientId → 400
 * - Patient not found → 404
 * - Forbidden (non-assigned clinician) → 403
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
  prisma: {
    patient: {
      findUnique: jest.fn(),
    },
    clinicalEncounter: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue({ id: 'audit-1' }),
  auditView: jest.fn(),
  auditCreate: jest.fn(),
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('GET /api/encounters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns encounter list for assigned clinician', async () => {
    const mockEncounters = [
      {
        id: 'enc-1',
        status: 'COMPLETED',
        chiefComplaint: 'Headache',
        scheduledAt: new Date('2025-01-15'),
        startedAt: new Date('2025-01-15'),
        endedAt: new Date('2025-01-15'),
      },
      {
        id: 'enc-2',
        status: 'SCHEDULED',
        chiefComplaint: 'Follow-up',
        scheduledAt: new Date('2025-02-01'),
        startedAt: null,
        endedAt: null,
      },
    ];

    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({
      assignedClinicianId: 'clinician-1',
    });
    (prisma.clinicalEncounter.findMany as jest.Mock).mockResolvedValue(mockEncounters);

    const req = new NextRequest(
      'http://localhost:3000/api/encounters?patientId=patient-1'
    );
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data).toHaveLength(2);
    expect(data.data[0].id).toBe('enc-1');
    expect(prisma.clinicalEncounter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { patientId: 'patient-1' },
        orderBy: { scheduledAt: 'desc' },
        take: 20,
      })
    );
  });

  it('allows ADMIN to view any patient encounters', async () => {
    const adminContext = {
      user: { id: 'admin-1', email: 'admin@holilabs.com', role: 'ADMIN' },
      requestId: 'req-2',
    };

    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({
      assignedClinicianId: 'other-clinician',
    });
    (prisma.clinicalEncounter.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest(
      'http://localhost:3000/api/encounters?patientId=patient-1'
    );
    const res = await GET(req, adminContext);

    expect(res.status).toBe(200);
  });

  it('returns 400 when patientId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/encounters');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Missing required query param: patientId');
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });

  it('returns 404 when patient not found', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest(
      'http://localhost:3000/api/encounters?patientId=nonexistent'
    );
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Patient not found');
  });

  it('returns 403 for non-assigned clinician', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({
      assignedClinicianId: 'other-clinician-99',
    });

    const req = new NextRequest(
      'http://localhost:3000/api/encounters?patientId=patient-1'
    );
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });
});
