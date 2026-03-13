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

jest.mock('@/lib/patients/dossier-queue', () => ({
  enqueuePatientDossierJob: jest.fn(),
}));

jest.mock('@/lib/patients/dossier', () => ({
  generatePatientDossier: jest.fn(),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');
const { enqueuePatientDossierJob } = require('@/lib/patients/dossier-queue');
const { generatePatientDossier } = require('@/lib/patients/dossier');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  params: { id: 'patient-1' },
  requestId: 'req-1',
};

describe('POST /api/patients/[id]/dossier/ensure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns READY when dossier is fresh', async () => {
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({ id: 'patient-1' });
    (prisma.patientDossier.findUnique as jest.Mock).mockResolvedValue({
      id: 'dossier-1',
      status: 'READY',
      lastComputedAt: new Date(),
    });

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/dossier/ensure', { method: 'POST' });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.fresh).toBe(true);
  });

  it('enqueues job when dossier is stale', async () => {
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({ id: 'patient-1' });
    (prisma.patientDossier.findUnique as jest.Mock).mockResolvedValue({
      id: 'dossier-1',
      status: 'READY',
      lastComputedAt: new Date('2020-01-01'),
    });
    (enqueuePatientDossierJob as jest.Mock).mockResolvedValue({ enqueued: true });

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/dossier/ensure', { method: 'POST' });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(202);
    expect(data.data.mode).toBe('queued');
  });

  it('falls back to inline when queue is unavailable', async () => {
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({ id: 'patient-1' });
    (prisma.patientDossier.findUnique as jest.Mock).mockResolvedValue(null);
    (enqueuePatientDossierJob as jest.Mock).mockResolvedValue({ enqueued: false });
    (generatePatientDossier as jest.Mock).mockResolvedValue({ status: 'READY', dossierId: 'dossier-new' });

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/dossier/ensure', { method: 'POST' });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.mode).toBe('inline');
  });

  it('returns 403 when access is denied', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(false);

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/dossier/ensure', { method: 'POST' });
    const res = await POST(req, mockContext);

    expect(res.status).toBe(403);
  });
});
