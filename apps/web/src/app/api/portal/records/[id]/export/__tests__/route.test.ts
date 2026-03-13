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

const { POST } = require('../route');
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
  objective: 'Vital signs normal',
  assessment: 'Tension headache',
  plan: 'Rest and hydration',
  status: 'SIGNED',
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15'),
  signedAt: null,
  patient: { id: 'patient-1', mrn: 'MRN-001', firstName: 'Maria', lastName: 'Silva', dateOfBirth: new Date('1990-01-15'), email: 'maria@test.com', phone: '+5511999' },
  clinician: { id: 'doc-1', firstName: 'Dr', lastName: 'Test', specialty: 'GP', licenseNumber: 'L1', npi: 'NPI1' },
};

describe('POST /api/portal/records/[id]/export', () => {
  beforeEach(() => jest.clearAllMocks());

  it('exports record as HTML', async () => {
    (prisma.sOAPNote.findUnique as jest.Mock).mockResolvedValue(mockRecord);

    const res = await POST(new NextRequest('http://localhost:3000/api/portal/records/note-1/export', { method: 'POST' }), mockContext);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/html');
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
    const html = await res.text();
    expect(html).toContain('Registro Médico');
    expect(html).toContain('Maria');
  });

  it('returns 404 when record not found', async () => {
    (prisma.sOAPNote.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await POST(new NextRequest('http://localhost:3000/api/portal/records/note-1/export', { method: 'POST' }), mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
  });

  it('returns 403 when record belongs to another patient', async () => {
    (prisma.sOAPNote.findUnique as jest.Mock).mockResolvedValue({
      ...mockRecord,
      patientId: 'patient-other',
    });

    const res = await POST(new NextRequest('http://localhost:3000/api/portal/records/note-1/export', { method: 'POST' }), mockContext);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.success).toBe(false);
  });

  it('returns 400 when no ID provided', async () => {
    const ctx = { ...mockContext, params: { id: '' } };

    const res = await POST(new NextRequest('http://localhost:3000/api/portal/records//export', { method: 'POST' }), ctx);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });
});
