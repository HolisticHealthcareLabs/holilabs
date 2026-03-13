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

jest.mock('@react-pdf/renderer', () => ({
  renderToStream: jest.fn(),
}));

jest.mock('@/components/pdf/SOAPNotePDF', () => ({
  SOAPNotePDF: jest.fn(),
}));

jest.mock('react', () => ({
  createElement: jest.fn().mockReturnValue({}),
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');
const { renderToStream } = require('@react-pdf/renderer');
const { createAuditLog } = require('@/lib/audit');

const mockContext = {
  session: { userId: 'pu-1', patientId: 'patient-1', email: 'p@test.com' },
  params: { id: 'note-1' },
  requestId: 'req-1',
};

const mockRecord = {
  id: 'note-1',
  patientId: 'patient-1',
  clinicianId: 'doc-1',
  createdAt: new Date('2024-01-15'),
  patient: { id: 'patient-1', firstName: 'Maria', lastName: 'Silva', dateOfBirth: new Date(), mrn: 'MRN-001' },
  clinician: { id: 'doc-1', firstName: 'Dr', lastName: 'Test', specialty: 'GP', licenseNumber: 'L1', npi: 'NPI1' },
  session: null,
};

function makePdfStream() {
  return {
    [Symbol.asyncIterator]: () => {
      let yielded = false;
      return {
        next: async () => {
          if (!yielded) {
            yielded = true;
            return { value: Buffer.from('pdf-data'), done: false };
          }
          return { value: undefined, done: true };
        },
      };
    },
  };
}

describe('GET /api/portal/records/[id]/pdf', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns PDF for record belonging to authenticated patient', async () => {
    (prisma.sOAPNote.findUnique as jest.Mock).mockResolvedValue(mockRecord);
    (renderToStream as jest.Mock).mockResolvedValue(makePdfStream());
    (createAuditLog as jest.Mock).mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost:3000/api/portal/records/note-1/pdf');
    const res = await GET(req, mockContext);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toContain('registro-medico-MRN-001');
  });

  it('returns 404 when record not found', async () => {
    (prisma.sOAPNote.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/portal/records/missing/pdf');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
  });

  it('returns 403 when record belongs to another patient', async () => {
    (prisma.sOAPNote.findUnique as jest.Mock).mockResolvedValue({
      ...mockRecord,
      patientId: 'other-patient',
    });

    const req = new NextRequest('http://localhost:3000/api/portal/records/note-1/pdf');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.success).toBe(false);
  });

  it('creates audit log on successful PDF export', async () => {
    (prisma.sOAPNote.findUnique as jest.Mock).mockResolvedValue(mockRecord);
    (renderToStream as jest.Mock).mockResolvedValue(makePdfStream());
    (createAuditLog as jest.Mock).mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost:3000/api/portal/records/note-1/pdf');
    await GET(req, mockContext);

    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'EXPORT', resource: 'SOAPNote' })
    );
  });
});
