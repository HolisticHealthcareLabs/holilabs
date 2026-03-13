import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    diagnosis: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => {
  const mock = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
  return { __esModule: true, default: mock, logger: mock };
});

const { DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@clinic.com', role: 'CLINICIAN' },
  params: { id: 'patient-1', diagnosisId: 'diagnosis-1' },
  requestId: 'req-1',
};

const mockDiagnosis = {
  id: 'diagnosis-1',
  icd10Code: 'J45.0',
  name: 'Asthma',
  status: 'ACTIVE',
  notes: null,
  patient: {
    id: 'patient-1',
    firstName: 'Maria',
    lastName: 'Lopez',
    assignedClinicianId: 'clinician-1',
  },
};

describe('DELETE /api/patients/[id]/diagnoses/[diagnosisId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('soft deletes diagnosis and returns resolved status', async () => {
    (prisma.diagnosis.findFirst as jest.Mock).mockResolvedValue(mockDiagnosis);
    (prisma.diagnosis.update as jest.Mock).mockResolvedValue({
      id: 'diagnosis-1',
      resolvedAt: new Date('2025-01-01'),
    });

    const req = new NextRequest(
      'http://localhost:3000/api/patients/patient-1/diagnoses/diagnosis-1',
      { method: 'DELETE' }
    );
    const res = await DELETE(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.newStatus).toBe('RESOLVED');
    expect(data.data.icd10Code).toBe('J45.0');
    expect(prisma.diagnosis.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'diagnosis-1' }, data: expect.objectContaining({ status: 'RESOLVED' }) })
    );
  });

  it('returns 403 when access is denied', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(false);

    const req = new NextRequest(
      'http://localhost:3000/api/patients/patient-1/diagnoses/diagnosis-1',
      { method: 'DELETE' }
    );
    const res = await DELETE(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toMatch(/access denied/i);
  });

  it('returns 404 when diagnosis not found', async () => {
    (prisma.diagnosis.findFirst as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest(
      'http://localhost:3000/api/patients/patient-1/diagnoses/diagnosis-1',
      { method: 'DELETE' }
    );
    const res = await DELETE(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toMatch(/not found/i);
  });

  it('returns 400 when diagnosis is already resolved', async () => {
    (prisma.diagnosis.findFirst as jest.Mock).mockResolvedValue({
      ...mockDiagnosis,
      status: 'RESOLVED',
    });

    const req = new NextRequest(
      'http://localhost:3000/api/patients/patient-1/diagnoses/diagnosis-1',
      { method: 'DELETE' }
    );
    const res = await DELETE(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/already/i);
  });
});
