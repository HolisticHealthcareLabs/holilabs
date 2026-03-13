import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findFirst: jest.fn() },
    auditLog: { findMany: jest.fn() },
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

const mockEvents = [
  { id: 'log-1', timestamp: new Date(), action: 'READ', resource: 'Patient', success: true, userEmail: 'dr@test.com', details: {} },
  { id: 'log-2', timestamp: new Date(), action: 'UPDATE', resource: 'Patient', success: true, userEmail: 'dr@test.com', details: {} },
];

describe('GET /api/patients/[id]/activity', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns activity log for authorized clinician', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({ id: 'patient-1' });
    (prisma.auditLog.findMany as jest.Mock).mockResolvedValue(mockEvents);

    const res = await GET(new NextRequest('http://localhost:3000/api/patients/patient-1/activity'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
  });

  it('returns 400 when patient ID is missing', async () => {
    const ctx = { ...mockContext, params: {} };

    const res = await GET(new NextRequest('http://localhost:3000/api/patients//activity'), ctx);
    const data = await res.json();

    expect(res.status).toBe(400);
  });

  it('returns 403 when access is denied', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(false);

    const res = await GET(new NextRequest('http://localhost:3000/api/patients/patient-1/activity'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(403);
  });

  it('returns 404 when patient not found', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await GET(new NextRequest('http://localhost:3000/api/patients/patient-1/activity'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
  });
});
