import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    dataAccessGrant: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    labResult: { findUnique: jest.fn() },
    imagingStudy: { findUnique: jest.fn() },
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

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'doc-1', email: 'doc@test.com' },
};

describe('GET /api/access-grants', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns active access grants for a patient', async () => {
    (prisma.dataAccessGrant.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'g-1',
        patientId: 'p-1',
        resourceType: 'LAB_RESULT',
        expiresAt: null,
        revokedAt: null,
        patient: { id: 'p-1', firstName: 'John', lastName: 'Doe', mrn: 'MRN001' },
        grantedToUser: null,
        labResult: null,
        imagingStudy: null,
      },
    ]);

    const req = new NextRequest('http://localhost:3000/api/access-grants?patientId=p-1');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].isActive).toBe(true);
  });

  it('returns 400 without patientId', async () => {
    const req = new NextRequest('http://localhost:3000/api/access-grants');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('patientId');
  });

  it('returns 500 on database error', async () => {
    (prisma.dataAccessGrant.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost:3000/api/access-grants?patientId=p-1');
    const res = await GET(req, mockContext);

    expect(res.status).toBe(500);
  });
});

describe('POST /api/access-grants', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a new access grant', async () => {
    (prisma.dataAccessGrant.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.dataAccessGrant.create as jest.Mock).mockResolvedValue({
      id: 'g-new',
      patientId: 'p-1',
      grantedToType: 'USER',
      grantedToId: 'u-1',
      resourceType: 'MEDICAL_RECORD',
      patient: { firstName: 'John', lastName: 'Doe', mrn: 'MRN001' },
      grantedToUser: { firstName: 'Dr', lastName: 'Smith', email: 'dr@test.com' },
    });
    (prisma.auditLog.create as jest.Mock).mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost:3000/api/access-grants', {
      method: 'POST',
      headers: { 'x-forwarded-for': '1.2.3.4' },
      body: JSON.stringify({
        patientId: 'p-1',
        grantedToType: 'USER',
        grantedToId: 'u-1',
        resourceType: 'MEDICAL_RECORD',
      }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('g-new');
  });

  it('returns 400 for missing required fields', async () => {
    const req = new NextRequest('http://localhost:3000/api/access-grants', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'p-1' }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Missing required fields');
  });

  it('returns 409 if active grant already exists', async () => {
    (prisma.dataAccessGrant.findFirst as jest.Mock).mockResolvedValue({ id: 'g-existing' });

    const req = new NextRequest('http://localhost:3000/api/access-grants', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'p-1',
        grantedToType: 'USER',
        grantedToId: 'u-1',
        resourceType: 'MEDICAL_RECORD',
      }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toContain('Active grant already exists');
  });

  it('returns 400 when USER type missing grantedToId', async () => {
    const req = new NextRequest('http://localhost:3000/api/access-grants', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'p-1',
        grantedToType: 'USER',
        resourceType: 'MEDICAL_RECORD',
      }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('grantedToId');
  });
});
