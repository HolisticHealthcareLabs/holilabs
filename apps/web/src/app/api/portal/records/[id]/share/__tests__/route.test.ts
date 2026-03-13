import { NextRequest } from 'next/server';

jest.mock('@/lib/api/patient-portal-middleware', () => ({
  createPatientPortalRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    sOAPNote: { findUnique: jest.fn() },
    documentShare: { create: jest.fn(), findMany: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

const { POST, GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  session: { userId: 'pu-1', patientId: 'patient-1', email: 'p@test.com' },
  params: { id: 'note-1' },
  requestId: 'req-1',
};

const mockRecord = {
  id: 'note-1',
  patientId: 'patient-1',
  chiefComplaint: 'Headache',
};

const mockShare = {
  id: 'share-1',
  patientId: 'patient-1',
  documentType: 'SOAP_NOTE',
  documentId: 'note-1',
  shareToken: 'tok-abc',
  expiresAt: new Date(Date.now() + 72 * 3600 * 1000),
  maxAccesses: null,
  recipientEmail: 'doctor@clinic.com',
  recipientName: 'Dr. House',
  purpose: 'Second opinion',
  accessCount: 0,
  lastAccessedAt: null,
  createdAt: new Date(),
};

describe('POST /api/portal/records/[id]/share', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates share link for authorized patient', async () => {
    (prisma.sOAPNote.findUnique as jest.Mock).mockResolvedValue(mockRecord);
    (prisma.documentShare.create as jest.Mock).mockResolvedValue(mockShare);

    const req = new NextRequest('http://localhost:3000/api/portal/records/note-1/share', {
      method: 'POST',
      body: JSON.stringify({ recipientEmail: 'doctor@clinic.com', recipientName: 'Dr. House' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(typeof data.data.shareToken).toBe('string');
    expect(data.data.shareUrl).toContain(data.data.shareToken);
  });

  it('returns 404 when record not found', async () => {
    (prisma.sOAPNote.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/portal/records/missing/share', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
  });

  it('returns 403 when record belongs to another patient', async () => {
    (prisma.sOAPNote.findUnique as jest.Mock).mockResolvedValue({
      ...mockRecord,
      patientId: 'other-patient',
    });

    const req = new NextRequest('http://localhost:3000/api/portal/records/note-1/share', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid request body', async () => {
    (prisma.sOAPNote.findUnique as jest.Mock).mockResolvedValue(mockRecord);

    const req = new NextRequest('http://localhost:3000/api/portal/records/note-1/share', {
      method: 'POST',
      body: JSON.stringify({ expiresInHours: -1 }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });
});

describe('GET /api/portal/records/[id]/share', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns list of active shares for the record', async () => {
    (prisma.sOAPNote.findUnique as jest.Mock).mockResolvedValue({ id: 'note-1', patientId: 'patient-1' });
    (prisma.documentShare.findMany as jest.Mock).mockResolvedValue([mockShare]);

    const req = new NextRequest('http://localhost:3000/api/portal/records/note-1/share');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
  });

  it('returns 403 when record belongs to another patient on GET', async () => {
    (prisma.sOAPNote.findUnique as jest.Mock).mockResolvedValue({
      id: 'note-1',
      patientId: 'other-patient',
    });

    const req = new NextRequest('http://localhost:3000/api/portal/records/note-1/share');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(403);
  });
});
