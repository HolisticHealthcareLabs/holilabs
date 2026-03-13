import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findFirst: jest.fn() },
    vitalSign: { create: jest.fn() },
  },
}));

jest.mock('@/lib/cache/patient-context-cache', () => ({
  invalidateVitals: jest.fn(),
  invalidatePatientFullContext: jest.fn(),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  params: { id: 'patient-1' },
  requestId: 'req-1',
};

const mockVital = {
  id: 'vital-1',
  patientId: 'patient-1',
  systolicBP: 120,
  diastolicBP: 80,
  heartRate: 72,
  temperature: null,
  respiratoryRate: null,
  oxygenSaturation: null,
  weight: null,
  height: null,
  recordedBy: 'clinician-1',
  source: 'MANUAL',
};

describe('POST /api/patients/[id]/vitals', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates vital signs with valid data', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({ id: 'patient-1' });
    (prisma.vitalSign.create as jest.Mock).mockResolvedValue(mockVital);

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/vitals', {
      method: 'POST',
      body: JSON.stringify({ systolicBP: 120, diastolicBP: 80, heartRate: 72 }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.systolicBP).toBe(120);
  });

  it('returns 400 when no vitals provided', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/vitals', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('vital');
  });

  it('returns 400 when patient ID is missing', async () => {
    const ctx = { ...mockContext, params: {} };

    const req = new NextRequest('http://localhost:3000/api/patients//vitals', {
      method: 'POST',
      body: JSON.stringify({ heartRate: 72 }),
    });
    const res = await POST(req, ctx);
    const data = await res.json();

    expect(res.status).toBe(400);
  });

  it('returns 403 when access is denied', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(false);

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/vitals', {
      method: 'POST',
      body: JSON.stringify({ heartRate: 72 }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(403);
  });

  it('returns 404 when patient not found by clinician', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/vitals', {
      method: 'POST',
      body: JSON.stringify({ heartRate: 72 }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
  });
});
