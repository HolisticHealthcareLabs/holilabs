import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/prisma', () => {
  const tx = {
    patient: { update: jest.fn() },
    prescription: { updateMany: jest.fn() },
    clinicalNote: { updateMany: jest.fn() },
    tokenMap: { deleteMany: jest.fn() },
    consent: { deleteMany: jest.fn() },
    deletionRequest: { update: jest.fn() },
  };
  return {
    prisma: {
      patient: { update: jest.fn() },
      deletionRequest: { findFirst: jest.fn(), update: jest.fn() },
      $transaction: jest.fn().mockImplementation((fn: any) => fn(tx)),
    },
  };
});

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'admin-1', email: 'admin@holilabs.com', role: 'ADMIN' },
  params: { id: 'patient-1' },
  requestId: 'req-1',
};

describe('POST /api/patients/[id]/erasure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('executes soft delete with valid token', async () => {
    (prisma.deletionRequest.findFirst as jest.Mock).mockResolvedValue({
      id: 'del-1',
      patientId: 'patient-1',
    });
    (prisma.patient.update as jest.Mock).mockResolvedValue({ id: 'patient-1' });
    (prisma.deletionRequest.update as jest.Mock).mockResolvedValue({ id: 'del-1' });

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/erasure', {
      method: 'POST',
      body: JSON.stringify({ type: 'soft', confirmationToken: 'tok-123' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.type).toBe('soft');
  });

  it('executes hard delete (anonymizes PII) with valid token', async () => {
    (prisma.deletionRequest.findFirst as jest.Mock).mockResolvedValue({
      id: 'del-1',
      patientId: 'patient-1',
    });

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/erasure', {
      method: 'POST',
      body: JSON.stringify({ type: 'hard', confirmationToken: 'tok-123' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.type).toBe('hard');
  });

  it('returns 400 when confirmationToken is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/erasure', {
      method: 'POST',
      body: JSON.stringify({ type: 'hard' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('confirmationToken');
  });

  it('returns 403 when user is not ADMIN', async () => {
    const ctx = { ...mockContext, user: { ...mockContext.user, role: 'CLINICIAN' } };

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/erasure', {
      method: 'POST',
      body: JSON.stringify({ type: 'soft', confirmationToken: 'tok-123' }),
    });
    const res = await POST(req, ctx);

    expect(res.status).toBe(403);
  });
});
