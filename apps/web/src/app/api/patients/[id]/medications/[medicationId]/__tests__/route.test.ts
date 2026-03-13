import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    medication: {
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
  params: { id: 'patient-1', medicationId: 'med-1' },
  requestId: 'req-1',
};

const mockMedication = {
  id: 'med-1',
  name: 'Metformin',
  isActive: true,
  notes: null,
  patient: {
    id: 'patient-1',
    firstName: 'Maria',
    lastName: 'Lopez',
    mrn: 'MRN-001',
    assignedClinicianId: 'clinician-1',
  },
};

describe('DELETE /api/patients/[id]/medications/[medicationId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('discontinues medication and returns DISCONTINUED status', async () => {
    (prisma.medication.findFirst as jest.Mock).mockResolvedValue(mockMedication);
    (prisma.medication.update as jest.Mock).mockResolvedValue({
      id: 'med-1',
      endDate: new Date('2025-01-01'),
    });

    const req = new NextRequest(
      'http://localhost:3000/api/patients/patient-1/medications/med-1',
      { method: 'DELETE' }
    );
    const res = await DELETE(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.newStatus).toBe('DISCONTINUED');
    expect(data.data.name).toBe('Metformin');
    expect(prisma.medication.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'med-1' }, data: expect.objectContaining({ isActive: false }) })
    );
  });

  it('returns 403 when access is denied', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(false);

    const req = new NextRequest(
      'http://localhost:3000/api/patients/patient-1/medications/med-1',
      { method: 'DELETE' }
    );
    const res = await DELETE(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toMatch(/access denied/i);
  });

  it('returns 404 when medication not found', async () => {
    (prisma.medication.findFirst as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest(
      'http://localhost:3000/api/patients/patient-1/medications/med-1',
      { method: 'DELETE' }
    );
    const res = await DELETE(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toMatch(/not found/i);
  });

  it('returns 400 when medication is already discontinued', async () => {
    (prisma.medication.findFirst as jest.Mock).mockResolvedValue({
      ...mockMedication,
      isActive: false,
    });

    const req = new NextRequest(
      'http://localhost:3000/api/patients/patient-1/medications/med-1',
      { method: 'DELETE' }
    );
    const res = await DELETE(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/already discontinued/i);
  });
});
