import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
    clinicalNote: { create: jest.fn(), findMany: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('@/lib/analytics/server-analytics', () => ({
  trackEvent: jest.fn().mockResolvedValue(undefined),
  ServerAnalyticsEvents: { CLINICAL_NOTE_CREATED: 'CLINICAL_NOTE_CREATED' },
}));

jest.mock('@/lib/socket-server', () => ({
  emitClinicalNoteEvent: jest.fn(),
}));

jest.mock('@/lib/logger', () => {
  const mock = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
  return { __esModule: true, default: mock, logger: mock };
});

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockImplementation((_err, opts) =>
    new (require('next/server').NextResponse)(JSON.stringify({ error: opts?.userMessage }), { status: 500 }),
  ),
}));

const { POST, GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN', name: 'Dr. Smith' },
  requestId: 'req-1',
};

describe('POST /api/clinical-notes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a clinical note successfully', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({ assignedClinicianId: 'clinician-1' });
    (prisma.clinicalNote.create as jest.Mock).mockResolvedValue({
      id: 'note-1',
      type: 'PROGRESS',
      patient: { id: 'p1', firstName: 'John', lastName: 'Doe', tokenId: 'TK-1' },
    });
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({ id: 'audit-1' });

    const req = new NextRequest('http://localhost:3000/api/clinical-notes', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'p1', noteType: 'PROGRESS', subjective: 'Headache' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
  });

  it('returns 400 when required fields are missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/clinical-notes', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Missing required');
  });

  it('returns 403 when clinician is not assigned to patient', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({ assignedClinicianId: 'other-clinician' });

    const req = new NextRequest('http://localhost:3000/api/clinical-notes', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'p1', noteType: 'PROGRESS' }),
    });
    const res = await POST(req, mockContext);

    expect(res.status).toBe(403);
  });
});

describe('GET /api/clinical-notes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns notes for a patient', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({ assignedClinicianId: 'clinician-1' });
    (prisma.clinicalNote.findMany as jest.Mock).mockResolvedValue([
      { id: 'note-1', type: 'PROGRESS' },
    ]);

    const req = new NextRequest('http://localhost:3000/api/clinical-notes?patientId=p1');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
  });

  it('returns 400 when patientId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/clinical-notes');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('patientId');
  });

  it('returns 404 when patient not found', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/clinical-notes?patientId=unknown');
    const res = await GET(req, mockContext);

    expect(res.status).toBe(404);
  });
});
