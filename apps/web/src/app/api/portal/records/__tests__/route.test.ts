import { NextRequest } from 'next/server';

jest.mock('@/lib/api/patient-portal-middleware', () => ({
  createPatientPortalRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    sOAPNote: { findMany: jest.fn(), count: jest.fn() },
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
  session: { userId: 'pu-1', patientId: 'patient-1', email: 'patient@example.com' },
  requestId: 'req-1',
  params: {},
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

const BASE_PARAMS = 'page=1&limit=20&sortBy=createdAt&sortOrder=desc&status=SIGNED&startDate=2025-01-01&endDate=2027-01-01&search=test';

function makeUrl(extra?: string) {
  const base = `http://localhost:3000/api/portal/records?${BASE_PARAMS}`;
  return extra ? `${base}&${extra}` : base;
}

describe('GET /api/portal/records', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns paginated records', async () => {
    (prisma.sOAPNote.findMany as jest.Mock).mockResolvedValue([mockRecord]);
    (prisma.sOAPNote.count as jest.Mock).mockResolvedValue(1);

    const res = await GET(new NextRequest(makeUrl()), mockContext);
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

    const url = `http://localhost:3000/api/portal/records?page=1&limit=20&sortBy=createdAt&sortOrder=desc&status=SIGNED&startDate=2025-01-01&endDate=2027-01-01&search=headache`;
    const res = await GET(new NextRequest(url), mockContext);
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

    await GET(new NextRequest(makeUrl()), mockContext);

    expect(prisma.sOAPNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'SIGNED' }),
      })
    );
  });

  it('returns empty list when no records', async () => {
    (prisma.sOAPNote.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.sOAPNote.count as jest.Mock).mockResolvedValue(0);

    const res = await GET(new NextRequest(makeUrl()), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.records).toEqual([]);
    expect(data.data.pagination.totalCount).toBe(0);
  });
});
