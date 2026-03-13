import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
    deletionRequest: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn() },
  },
}));

jest.mock('@/lib/email/deletion-emails', () => ({
  sendDeletionConfirmationEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/logger', () => {
  const mock = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
  return { __esModule: true, default: mock, logger: mock };
});

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockImplementation((_err, opts) =>
    new (require('next/server').NextResponse)(JSON.stringify({ error: opts?.userMessage }), { status: 500 }),
  ),
}));

const { POST, GET } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'ADMIN' },
  params: { id: 'patient-1' },
  requestId: 'req-1',
};

describe('POST /api/patients/[id]/request-deletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('creates deletion request and sends email', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({
      id: 'patient-1', email: 'john@test.com', firstName: 'John', lastName: 'Doe', deletedAt: null,
    });
    (prisma.deletionRequest.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.deletionRequest.create as jest.Mock).mockResolvedValue({
      id: 'del-1',
      status: 'PENDING_CONFIRMATION',
      requestedAt: new Date(),
      confirmationDeadline: new Date(),
      confirmationToken: 'token-abc',
    });

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/request-deletion', {
      method: 'POST',
      body: JSON.stringify({ reason: 'Patient requested', legalBasis: 'GDPR_ARTICLE_17' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 403 when access is denied', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(false);

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/request-deletion', {
      method: 'POST',
      body: JSON.stringify({ reason: 'test' }),
    });
    const res = await POST(req, mockContext);

    expect(res.status).toBe(403);
  });

  it('returns 409 when pending request already exists', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({
      id: 'patient-1', email: 'j@t.com', firstName: 'J', lastName: 'D', deletedAt: null,
    });
    (prisma.deletionRequest.findFirst as jest.Mock).mockResolvedValue({
      status: 'PENDING_CONFIRMATION',
      requestedAt: new Date(),
      confirmationDeadline: new Date(),
    });

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/request-deletion', {
      method: 'POST',
      body: JSON.stringify({ reason: 'test' }),
    });
    const res = await POST(req, mockContext);

    expect(res.status).toBe(409);
  });
});

describe('GET /api/patients/[id]/request-deletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns list of deletion requests', async () => {
    (prisma.deletionRequest.findMany as jest.Mock).mockResolvedValue([
      { id: 'del-1', status: 'PENDING_CONFIRMATION' },
    ]);

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/request-deletion');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.requests).toHaveLength(1);
  });

  it('returns 403 when access is denied', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(false);

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/request-deletion');
    const res = await GET(req, mockContext);

    expect(res.status).toBe(403);
  });
});
