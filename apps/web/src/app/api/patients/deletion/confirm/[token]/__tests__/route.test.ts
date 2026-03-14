import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue({ id: 'a1' }),
}));

jest.mock('@/lib/email/deletion-emails', () => ({
  sendDeletionCompletedEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockReturnValue(
    new (require('next/server').NextResponse)(JSON.stringify({ error: 'Error' }), { status: 500 })
  ),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    deletionRequest: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const futureDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const pastDeadline = new Date(Date.now() - 1000);

const mockDeletionRequest = {
  id: 'del-req-1',
  confirmationToken: 'valid-token',
  status: 'PENDING',
  requestedAt: new Date(),
  confirmedAt: null,
  executedAt: null,
  confirmationDeadline: futureDeadline,
  patientId: 'pat-1',
  legalBasis: 'GDPR_ARTICLE_17',
  reason: 'User request',
  patient: {
    id: 'pat-1',
    firstName: 'Ana',
    lastName: 'Lima',
    email: 'ana@example.com',
    mrn: 'MRN001',
    deletedAt: null,
  },
};

describe('GET /api/patients/deletion/confirm/[token]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.deletionRequest.findUnique as jest.Mock).mockResolvedValue(mockDeletionRequest);
  });

  it('returns deletion request details for valid token', async () => {
    const req = new NextRequest('http://localhost:3000/api/patients/deletion/confirm/valid-token');
    const res = await GET(req, { params: { token: 'valid-token' } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.request.status).toBe('PENDING');
  });

  it('returns 404 for invalid token', async () => {
    (prisma.deletionRequest.findUnique as jest.Mock).mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/patients/deletion/confirm/bad-token');
    const res = await GET(req, { params: { token: 'bad-token' } });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain('Invalid');
  });

  it('returns 400 when request is already completed', async () => {
    (prisma.deletionRequest.findUnique as jest.Mock).mockResolvedValue({
      ...mockDeletionRequest,
      status: 'COMPLETED',
    });
    const req = new NextRequest('http://localhost:3000/api/patients/deletion/confirm/valid-token');
    const res = await GET(req, { params: { token: 'valid-token' } });

    expect(res.status).toBe(400);
  });

  it('returns 410 when request is expired and marks it as expired', async () => {
    (prisma.deletionRequest.findUnique as jest.Mock).mockResolvedValue({
      ...mockDeletionRequest,
      confirmationDeadline: pastDeadline,
    });
    (prisma.deletionRequest.update as jest.Mock).mockResolvedValue(undefined);
    const req = new NextRequest('http://localhost:3000/api/patients/deletion/confirm/valid-token');
    const res = await GET(req, { params: { token: 'valid-token' } });

    expect(res.status).toBe(410);
    expect(prisma.deletionRequest.update).toHaveBeenCalled();
  });
});

describe('POST /api/patients/deletion/confirm/[token]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.deletionRequest.findUnique as jest.Mock).mockResolvedValue(mockDeletionRequest);
    (prisma.$transaction as jest.Mock).mockResolvedValue(undefined);
  });

  it('executes deletion successfully for valid token', async () => {
    const req = new NextRequest('http://localhost:3000/api/patients/deletion/confirm/valid-token', {
      method: 'POST',
    });
    const res = await POST(req, { params: { token: 'valid-token' } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('deleted');
  });

  it('returns 404 for invalid token', async () => {
    (prisma.deletionRequest.findUnique as jest.Mock).mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/patients/deletion/confirm/bad-token', {
      method: 'POST',
    });
    const res = await POST(req, { params: { token: 'bad-token' } });

    expect(res.status).toBe(404);
  });

  it('returns 410 when request has expired', async () => {
    (prisma.deletionRequest.findUnique as jest.Mock).mockResolvedValue({
      ...mockDeletionRequest,
      confirmationDeadline: pastDeadline,
    });
    (prisma.deletionRequest.update as jest.Mock).mockResolvedValue(undefined);
    const req = new NextRequest('http://localhost:3000/api/patients/deletion/confirm/valid-token', {
      method: 'POST',
    });
    const res = await POST(req, { params: { token: 'valid-token' } });

    expect(res.status).toBe(410);
  });
});
