import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
    patientPreferences: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

const { GET, PUT } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  params: { id: 'patient-1' },
  requestId: 'req-1',
};

const mockPrefs = {
  id: 'pref-1',
  patientId: 'patient-1',
  smsEnabled: true,
  emailEnabled: true,
};

describe('GET /api/patients/[id]/preferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns existing preferences', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({ id: 'patient-1' });
    (prisma.patientPreferences.findUnique as jest.Mock).mockResolvedValue(mockPrefs);

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/preferences');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.smsEnabled).toBe(true);
  });

  it('creates default preferences when none exist', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({ id: 'patient-1' });
    (prisma.patientPreferences.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.patientPreferences.create as jest.Mock).mockResolvedValue(mockPrefs);

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/preferences');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 403 when access is denied', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(false);

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/preferences');
    const res = await GET(req, mockContext);

    expect(res.status).toBe(403);
  });

  it('returns 404 when patient not found', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/preferences');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/patients/[id]/preferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('updates preferences successfully', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({ id: 'patient-1' });
    (prisma.patientPreferences.upsert as jest.Mock).mockResolvedValue({ ...mockPrefs, smsEnabled: false });

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/preferences', {
      method: 'PUT',
      body: JSON.stringify({ smsEnabled: false }),
    });
    const res = await PUT(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 403 when access is denied', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(false);

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/preferences', {
      method: 'PUT',
      body: JSON.stringify({ smsEnabled: false }),
    });
    const res = await PUT(req, mockContext);

    expect(res.status).toBe(403);
  });

  it('returns 404 when patient not found', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/preferences', {
      method: 'PUT',
      body: JSON.stringify({ smsEnabled: false }),
    });
    const res = await PUT(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
  });
});
