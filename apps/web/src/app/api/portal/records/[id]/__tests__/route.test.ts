import { NextRequest } from 'next/server';

jest.mock('@/lib/api/patient-portal-middleware', () => ({
  createPatientPortalRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    sOAPNote: { findUnique: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn(),
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  session: { userId: 'pu-1', patientId: 'patient-1', email: 'patient@example.com' },
  params: { id: 'note-1' },
  requestId: 'req-1',
};

const mockRecord = {
  id: 'note-1',
  patientId: 'patient-1',
  clinicianId: 'doc-1',
  chiefComplaint: 'Headache',
  subjective: 'Patient reports headache',
  status: 'SIGNED',
  createdAt: new Date(),
  patient: { id: 'patient-1', firstName: 'Maria', lastName: 'Silva', dateOfBirth: new Date(), mrn: 'MRN-001' },
  clinician: { id: 'doc-1', firstName: 'Dr', lastName: 'Test', specialty: 'GP', licenseNumber: 'L1', npi: 'NPI1' },
  session: null,
};

describe('GET /api/portal/records/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns record detail for authorized patient', async () => {
    (prisma.sOAPNote.findUnique as jest.Mock).mockResolvedValue(mockRecord);

    const res = await GET(new NextRequest('http://localhost:3000/api/portal/records/note-1'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('note-1');
  });

  it('returns 404 when record not found', async () => {
    (prisma.sOAPNote.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await GET(new NextRequest('http://localhost:3000/api/portal/records/missing'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
  });

  it('returns 403 when record belongs to another patient', async () => {
    (prisma.sOAPNote.findUnique as jest.Mock).mockResolvedValue({
      ...mockRecord,
      patientId: 'patient-other',
    });

    const res = await GET(new NextRequest('http://localhost:3000/api/portal/records/note-1'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.success).toBe(false);
  });
});
