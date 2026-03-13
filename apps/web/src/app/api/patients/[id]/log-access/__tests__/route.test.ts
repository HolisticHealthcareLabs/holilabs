import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  params: { id: 'patient-1' },
  requestId: 'req-1',
};

describe('POST /api/patients/[id]/log-access', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('logs access with valid reason', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({ id: 'patient-1', firstName: 'John', lastName: 'Doe' });
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({ id: 'audit-1' });

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/log-access', {
      method: 'POST',
      body: JSON.stringify({ accessReason: 'DIRECT_PATIENT_CARE' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.lgpdCompliance).toBe(true);
  });

  it('returns 400 when access reason is invalid', async () => {
    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/log-access', {
      method: 'POST',
      body: JSON.stringify({ accessReason: 'INVALID_REASON' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Invalid access reason');
  });

  it('returns 403 when access is denied', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(false);

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/log-access', {
      method: 'POST',
      body: JSON.stringify({ accessReason: 'DIRECT_PATIENT_CARE' }),
    });
    const res = await POST(req, mockContext);

    expect(res.status).toBe(403);
  });

  it('returns 404 when patient not found', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/log-access', {
      method: 'POST',
      body: JSON.stringify({ accessReason: 'DIRECT_PATIENT_CARE' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
  });
});
