import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    documentShare: { findUnique: jest.fn(), update: jest.fn() },
    sOAPNote: { findUnique: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockShare = {
  id: 'share-1',
  shareTokenHash: 'abc123hash',
  documentId: 'note-1',
  patientId: 'patient-1',
  isActive: true,
  expiresAt: null,
  requirePassword: false,
  passwordHash: null,
  maxAccesses: null,
  accessCount: 0,
  accessedAt: null,
  lastAccessedAt: null,
  accessIpAddresses: [],
  recipientName: 'Dr. Jones',
  recipientEmail: 'jones@clinic.com',
  purpose: 'Second opinion',
  allowDownload: true,
  patient: { id: 'patient-1', firstName: 'Jane', lastName: 'Doe', dateOfBirth: new Date('1980-01-01'), mrn: 'MRN001' },
};

const mockSOAPNote = {
  id: 'note-1',
  patientId: 'patient-1',
  subjective: 'Patient reports headache',
  patient: { id: 'patient-1', firstName: 'Jane', lastName: 'Doe', dateOfBirth: new Date('1980-01-01'), mrn: 'MRN001' },
  clinician: { id: 'doc-1', firstName: 'Dr.', lastName: 'Smith', specialty: 'Internal Medicine', licenseNumber: 'LIC123', npi: 'NPI456' },
  session: { id: 'session-1', audioDuration: 300, createdAt: new Date() },
};

function makeShareContext(token: string) {
  return { params: { shareToken: token } };
}

describe('GET /api/shared/[shareToken]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns shared medical record for valid token', async () => {
    (prisma.documentShare.findUnique as jest.Mock).mockResolvedValue(mockShare);
    (prisma.sOAPNote.findUnique as jest.Mock).mockResolvedValue(mockSOAPNote);
    (prisma.documentShare.update as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/shared/validtoken123');
    const res = await GET(req, makeShareContext('validtoken123'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.record.id).toBe('note-1');
    expect(data.data.share.recipientName).toBe('Dr. Jones');
  });

  it('returns 404 when share token not found', async () => {
    (prisma.documentShare.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/shared/invalidtoken');
    const res = await GET(req, makeShareContext('invalidtoken'));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
  });

  it('returns 403 when share is revoked (isActive false)', async () => {
    (prisma.documentShare.findUnique as jest.Mock).mockResolvedValue({
      ...mockShare,
      isActive: false,
    });

    const req = new NextRequest('http://localhost:3000/api/shared/revokedtoken');
    const res = await GET(req, makeShareContext('revokedtoken'));
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain('revocado');
  });

  it('returns 403 when share has expired', async () => {
    (prisma.documentShare.findUnique as jest.Mock).mockResolvedValue({
      ...mockShare,
      expiresAt: new Date(Date.now() - 1000), // 1 second ago
    });

    const req = new NextRequest('http://localhost:3000/api/shared/expiredtoken');
    const res = await GET(req, makeShareContext('expiredtoken'));
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain('expirado');
  });
});
