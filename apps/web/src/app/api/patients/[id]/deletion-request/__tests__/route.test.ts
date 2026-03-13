import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    deletionRequest: { findFirst: jest.fn(), create: jest.fn() },
  },
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'ADMIN' },
  params: { id: 'patient-1' },
  requestId: 'req-1',
};

describe('POST /api/patients/[id]/deletion-request', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('creates deletion request for admin', async () => {
    (prisma.deletionRequest.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.deletionRequest.create as jest.Mock).mockResolvedValue({
      id: 'del-1',
      status: 'PENDING_CONFIRMATION',
    });

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/deletion-request', {
      method: 'POST',
      body: JSON.stringify({ legalBasis: 'LGPD_ARTICLE_18' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.status).toBe('PENDING_CONFIRMATION');
  });

  it('returns 400 when patient ID is missing', async () => {
    const ctx = { ...mockContext, params: {} };

    const req = new NextRequest('http://localhost:3000/api/patients//deletion-request', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req, ctx);

    expect(res.status).toBe(400);
  });

  it('returns 403 for non-admin without access', async () => {
    const ctx = { ...mockContext, user: { ...mockContext.user, role: 'CLINICIAN' } };
    (verifyPatientAccess as jest.Mock).mockResolvedValue(false);

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/deletion-request', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req, ctx);

    expect(res.status).toBe(403);
  });

  it('returns 409 when pending request already exists', async () => {
    (prisma.deletionRequest.findFirst as jest.Mock).mockResolvedValue({
      id: 'existing-del',
      status: 'PENDING_CONFIRMATION',
    });

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/deletion-request', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toContain('already pending');
  });
});
