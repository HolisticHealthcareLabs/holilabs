import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findFirst: jest.fn() },
    patientDossier: { findUnique: jest.fn() },
  },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  params: { id: 'patient-1' },
  requestId: 'req-1',
};

describe('GET /api/patients/[id]/dossier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns dossier for authorized clinician', async () => {
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({ id: 'patient-1' });
    (prisma.patientDossier.findUnique as jest.Mock).mockResolvedValue({
      id: 'dossier-1',
      status: 'READY',
      version: 1,
    });

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/dossier');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('dossier-1');
  });

  it('returns 400 when patient ID is missing', async () => {
    const ctx = { ...mockContext, params: {} };

    const req = new NextRequest('http://localhost:3000/api/patients//dossier');
    const res = await GET(req, ctx);
    const data = await res.json();

    expect(res.status).toBe(400);
  });

  it('returns 403 when access is denied', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(false);

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/dossier');
    const res = await GET(req, mockContext);

    expect(res.status).toBe(403);
  });

  it('returns 404 when patient not assigned to clinician', async () => {
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/dossier');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
  });
});
