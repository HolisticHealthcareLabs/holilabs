import { NextRequest } from 'next/server';

jest.mock('@/lib/api/patient-portal-middleware', () => ({
  createPatientPortalRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    document: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue({ id: 'audit-1' }),
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  session: { userId: 'pu-1', patientId: 'patient-1', email: 'patient@test.com' },
  requestId: 'req-1',
  params: {},
};

describe('GET /api/portal/documents', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns documents grouped by type', async () => {
    (prisma.document.findMany as jest.Mock).mockResolvedValue([
      { id: 'd-1', documentType: 'LAB_RESULT', fileSize: 1024, createdAt: new Date() },
      { id: 'd-2', documentType: 'LAB_RESULT', fileSize: 2048, createdAt: new Date() },
      { id: 'd-3', documentType: 'PRESCRIPTION', fileSize: 512, createdAt: new Date() },
    ]);

    const res = await GET(
      new NextRequest('http://localhost:3000/api/portal/documents?type=LAB_RESULT&limit=50'),
      mockContext
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.summary.total).toBe(3);
    expect(data.data.summary.byType.LAB_RESULT).toBe(2);
    expect(data.data.summary.byType.PRESCRIPTION).toBe(1);
  });

  it('returns empty list when no documents', async () => {
    (prisma.document.findMany as jest.Mock).mockResolvedValue([]);

    const res = await GET(
      new NextRequest('http://localhost:3000/api/portal/documents?type=LAB_RESULT&limit=50'),
      mockContext
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.summary.total).toBe(0);
  });

  it('filters by document type', async () => {
    (prisma.document.findMany as jest.Mock).mockResolvedValue([]);

    await GET(
      new NextRequest('http://localhost:3000/api/portal/documents?type=LAB_RESULT&limit=50'),
      mockContext
    );

    expect(prisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ documentType: 'LAB_RESULT' }),
      })
    );
  });

  it('respects limit parameter', async () => {
    (prisma.document.findMany as jest.Mock).mockResolvedValue([]);

    await GET(
      new NextRequest('http://localhost:3000/api/portal/documents?type=LAB_RESULT&limit=10'),
      mockContext
    );

    expect(prisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 })
    );
  });
});
