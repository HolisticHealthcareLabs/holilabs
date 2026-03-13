import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    dataAccessGrant: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: (error: any, opts: any) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: opts.userMessage }, { status: 500 });
  },
}));

const { GET, PATCH, DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'doc-1', email: 'doc@test.com' },
  params: { id: 'g-1' },
};

describe('GET /api/access-grants/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns a single access grant with computed status', async () => {
    (prisma.dataAccessGrant.findUnique as jest.Mock).mockResolvedValue({
      id: 'g-1',
      expiresAt: null,
      revokedAt: null,
      patient: { id: 'p-1', firstName: 'John', lastName: 'Doe', mrn: 'MRN001' },
      grantedToUser: null,
      labResult: null,
      imagingStudy: null,
    });

    const req = new NextRequest('http://localhost:3000/api/access-grants/g-1');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.isActive).toBe(true);
    expect(data.data.isRevoked).toBe(false);
  });

  it('returns 404 when grant not found', async () => {
    (prisma.dataAccessGrant.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/access-grants/g-missing');
    const res = await GET(req, { ...mockContext, params: { id: 'g-missing' } });

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/access-grants/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('revokes an access grant', async () => {
    (prisma.dataAccessGrant.findUnique as jest.Mock).mockResolvedValue({
      id: 'g-1',
      revokedAt: null,
      expiresAt: null,
      canView: true,
      canDownload: false,
      canShare: false,
    });
    (prisma.dataAccessGrant.update as jest.Mock).mockResolvedValue({
      id: 'g-1',
      revokedAt: new Date(),
      patient: { firstName: 'John', lastName: 'Doe', mrn: 'MRN001' },
      grantedToUser: null,
    });
    (prisma.auditLog.create as jest.Mock).mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost:3000/api/access-grants/g-1', {
      method: 'PATCH',
      headers: { 'x-forwarded-for': '1.2.3.4' },
      body: JSON.stringify({ revoke: true, revokedReason: 'Patient request' }),
    });

    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('revoked');
  });

  it('returns 404 when grant not found', async () => {
    (prisma.dataAccessGrant.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/access-grants/g-missing', {
      method: 'PATCH',
      body: JSON.stringify({ canDownload: true }),
    });

    const res = await PATCH(req, { ...mockContext, params: { id: 'g-missing' } });

    expect(res.status).toBe(404);
  });

  it('returns 400 when revoking an already revoked grant', async () => {
    (prisma.dataAccessGrant.findUnique as jest.Mock).mockResolvedValue({
      id: 'g-1',
      revokedAt: new Date(),
    });

    const req = new NextRequest('http://localhost:3000/api/access-grants/g-1', {
      method: 'PATCH',
      body: JSON.stringify({ revoke: true }),
    });

    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('already revoked');
  });
});

describe('DELETE /api/access-grants/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes a never-accessed grant', async () => {
    (prisma.dataAccessGrant.findUnique as jest.Mock).mockResolvedValue({
      id: 'g-1',
      accessCount: 0,
      grantedToType: 'USER',
      grantedToId: 'u-1',
      grantedToEmail: null,
      resourceType: 'LAB_RESULT',
      patientId: 'p-1',
      patient: { firstName: 'John', lastName: 'Doe', mrn: 'MRN001' },
    });
    (prisma.dataAccessGrant.delete as jest.Mock).mockResolvedValue(undefined);
    (prisma.auditLog.create as jest.Mock).mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost:3000/api/access-grants/g-1', {
      method: 'DELETE',
      headers: { 'x-forwarded-for': '1.2.3.4' },
    });

    const res = await DELETE(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 403 when trying to delete an accessed grant', async () => {
    (prisma.dataAccessGrant.findUnique as jest.Mock).mockResolvedValue({
      id: 'g-1',
      accessCount: 5,
      patient: { firstName: 'John', lastName: 'Doe', mrn: 'MRN001' },
    });

    const req = new NextRequest('http://localhost:3000/api/access-grants/g-1', { method: 'DELETE' });
    const res = await DELETE(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain('Cannot delete grant');
  });

  it('returns 404 when grant not found', async () => {
    (prisma.dataAccessGrant.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/access-grants/g-missing', { method: 'DELETE' });
    const res = await DELETE(req, { ...mockContext, params: { id: 'g-missing' } });

    expect(res.status).toBe(404);
  });
});
