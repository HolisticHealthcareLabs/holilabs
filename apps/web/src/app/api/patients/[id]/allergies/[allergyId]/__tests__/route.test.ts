import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    allergy: {
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
  params: { id: 'patient-1', allergyId: 'allergy-1' },
  requestId: 'req-1',
};

const mockAllergy = {
  id: 'allergy-1',
  allergen: 'Penicillin',
  isActive: true,
  notes: null,
  patient: {
    id: 'patient-1',
    firstName: 'Maria',
    lastName: 'Lopez',
    assignedClinicianId: 'clinician-1',
  },
};

describe('DELETE /api/patients/[id]/allergies/[allergyId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('soft deletes allergy and returns resolved status', async () => {
    (prisma.allergy.findFirst as jest.Mock).mockResolvedValue(mockAllergy);
    (prisma.allergy.update as jest.Mock).mockResolvedValue({
      id: 'allergy-1',
      resolvedAt: new Date('2025-01-01'),
      resolvedBy: 'clinician-1',
    });

    const req = new NextRequest(
      'http://localhost:3000/api/patients/patient-1/allergies/allergy-1',
      { method: 'DELETE' }
    );
    const res = await DELETE(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.newStatus).toBe('RESOLVED');
    expect(data.data.allergen).toBe('Penicillin');
    expect(prisma.allergy.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'allergy-1' }, data: expect.objectContaining({ isActive: false }) })
    );
  });

  it('returns 403 when access is denied', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(false);

    const req = new NextRequest(
      'http://localhost:3000/api/patients/patient-1/allergies/allergy-1',
      { method: 'DELETE' }
    );
    const res = await DELETE(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toMatch(/access denied/i);
  });

  it('returns 404 when allergy not found', async () => {
    (prisma.allergy.findFirst as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest(
      'http://localhost:3000/api/patients/patient-1/allergies/allergy-1',
      { method: 'DELETE' }
    );
    const res = await DELETE(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toMatch(/not found/i);
  });

  it('returns 400 when allergy is already inactive', async () => {
    (prisma.allergy.findFirst as jest.Mock).mockResolvedValue({
      ...mockAllergy,
      isActive: false,
    });

    const req = new NextRequest(
      'http://localhost:3000/api/patients/patient-1/allergies/allergy-1',
      { method: 'DELETE' }
    );
    const res = await DELETE(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/already/i);
  });
});
