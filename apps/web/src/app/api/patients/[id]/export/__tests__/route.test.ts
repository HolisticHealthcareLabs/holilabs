/**
 * Tests for GET /api/patients/[id]/export (Habeas Data)
 *
 * - GET exports patient data (LGPD Art. 18)
 * - Returns 404 for missing patient
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
    prescription: { findMany: jest.fn() },
    clinicalNote: { findMany: jest.fn() },
    vitalSign: { findMany: jest.fn() },
    diagnosis: { findMany: jest.fn() },
    consent: { findMany: jest.fn() },
    labResult: { findMany: jest.fn() },
    auditLog: { findMany: jest.fn() },
  },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
  params: { id: 'patient-123' },
};

const mockPatient = {
  id: 'patient-123',
  firstName: 'Maria',
  lastName: 'Silva',
  email: 'maria@example.com',
  dateOfBirth: new Date('1990-01-15'),
  gender: 'FEMALE',
  phone: '+5511999999999',
  address: null,
  mrn: 'MRN-001',
  createdAt: new Date(),
  updatedAt: new Date(),
  assignedClinicianId: 'clinician-1',
};

describe('GET /api/patients/[id]/export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.prescription.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.clinicalNote.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.vitalSign.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.diagnosis.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.consent.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.labResult.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);
  });

  it('exports patient data (Habeas Data) with all clinical domains', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatient);

    const request = new NextRequest('http://localhost:3000/api/patients/patient-123/export');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.patient).toBeDefined();
    expect(data.patient.id).toBe('patient-123');
    expect(data.patient.firstName).toBe('Maria');
    expect(data.patient.lastName).toBe('Silva');
    expect(data.prescriptions).toEqual([]);
    expect(data.diagnoses).toEqual([]);
    expect(data.vitalSigns).toEqual([]);
    expect(data.clinicalNotes).toEqual([]);
    expect(data.consents).toEqual([]);
    expect(data.labResults).toEqual([]);
    expect(data.auditLogs).toEqual([]);
    expect(data.meta).toBeDefined();
    expect(data.meta.exportedAt).toBeDefined();
  });

  it('returns 404 for missing patient', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/patients/nonexistent/export');
    const ctx = { ...mockContext, params: { id: 'nonexistent' } };
    const response = await GET(request, ctx);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Patient not found');
  });

  it('returns 400 when patient ID is missing', async () => {
    const ctxNoId = { ...mockContext, params: {} };
    const request = new NextRequest('http://localhost:3000/api/patients//export');

    const response = await GET(request, ctxNoId);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Patient ID required');
  });
});
