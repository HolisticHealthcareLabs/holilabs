import { NextRequest } from 'next/server';

jest.mock('@/lib/api/patient-portal-middleware', () => ({
  createPatientPortalRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    sOAPNote: { findMany: jest.fn(), count: jest.fn() },
  },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn(),
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  session: { userId: 'pu-1', patientId: 'patient-1', email: 'patient@example.com' },
  requestId: 'req-1',
};

const mockRecord = {
  id: 'note-1',
  patientId: 'patient-1',
  chiefComplaint: 'Headache',
  subjective: 'Patient reports headache',
  status: 'SIGNED',
  createdAt: new Date(),
  clinician: { id: 'doc-1', firstName: 'Dr', lastName: 'Test', specialty: 'GP' },
  session: null,
};

describe('GET /api/portal/records', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns paginated records', async () => {
    (prisma.sOAPNote.findMany as jest.Mock).mockResolvedValue([mockRecord]);
    (prisma.sOAPNote.count as jest.Mock).mockResolvedValue(1);

    const res = await GET(new NextRequest('http://localhost:3000/api/portal/records'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.records).toHaveLength(1);
    expect(data.data.pagination.totalCount).toBe(1);
    expect(data.data.pagination.page).toBe(1);
  });

  it('applies search filter', async () => {
    (prisma.sOAPNote.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.sOAPNote.count as jest.Mock).mockResolvedValue(0);

    const res = await GET(
      new NextRequest('http://localhost:3000/api/portal/records?search=headache'),
      mockContext
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(prisma.sOAPNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          patientId: 'patient-1',
          OR: expect.arrayContaining([
            expect.objectContaining({ subjective: { contains: 'headache', mode: 'insensitive' } }),
          ]),
        }),
      })
    );
  });

  it('applies status filter', async () => {
    (prisma.sOAPNote.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.sOAPNote.count as jest.Mock).mockResolvedValue(0);

    await GET(
      new NextRequest('http://localhost:3000/api/portal/records?status=SIGNED'),
      mockContext
    );

    expect(prisma.sOAPNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'SIGNED' }),
      })
    );
  });

  it('returns empty list when no records', async () => {
    (prisma.sOAPNote.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.sOAPNote.count as jest.Mock).mockResolvedValue(0);

    const res = await GET(new NextRequest('http://localhost:3000/api/portal/records'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.records).toEqual([]);
    expect(data.data.pagination.totalCount).toBe(0);
  });
});
