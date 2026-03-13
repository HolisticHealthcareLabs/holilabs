import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    clinicalNote: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/clinical-notes/version-control', () => ({
  createNoteVersion: jest.fn().mockResolvedValue(undefined),
  calculateNoteHash: jest.fn().mockReturnValue('hash-abc'),
}));

jest.mock('@/lib/analytics/server-analytics', () => ({
  trackEvent: jest.fn().mockResolvedValue(undefined),
  ServerAnalyticsEvents: {
    CLINICAL_NOTE_UPDATED: 'CLINICAL_NOTE_UPDATED',
  },
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

const { GET, PATCH, DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  params: { id: 'note-1' },
  requestId: 'req-1',
};

const mockNote = {
  id: 'note-1',
  type: 'PROGRESS',
  patientId: 'p1',
  authorId: 'clinician-1',
  subjective: 'Headache',
  objective: 'Stable',
  assessment: 'Migraine',
  plan: 'Rest',
  chiefComplaint: '',
  diagnosis: [],
  signedAt: null,
  patient: {
    id: 'p1',
    firstName: 'John',
    lastName: 'Doe',
    tokenId: 'TK-1',
    assignedClinicianId: 'clinician-1',
  },
  versions: [],
};

describe('GET /api/clinical-notes/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns a clinical note', async () => {
    (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue(mockNote);

    const req = new NextRequest('http://localhost:3000/api/clinical-notes/note-1');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('note-1');
  });

  it('returns 404 when note not found', async () => {
    (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/clinical-notes/unknown');
    const res = await GET(req, mockContext);

    expect(res.status).toBe(404);
  });

  it('returns 403 when clinician is not authorized', async () => {
    (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue({
      ...mockNote,
      patient: { ...mockNote.patient, assignedClinicianId: 'other-clinician' },
    });

    const req = new NextRequest('http://localhost:3000/api/clinical-notes/note-1');
    const res = await GET(req, mockContext);

    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/clinical-notes/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates a clinical note with versioning', async () => {
    (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue(mockNote);
    (prisma.clinicalNote.update as jest.Mock).mockResolvedValue({
      ...mockNote,
      subjective: 'Updated headache notes',
      versions: [],
    });

    const req = new NextRequest('http://localhost:3000/api/clinical-notes/note-1', {
      method: 'PATCH',
      body: JSON.stringify({ subjective: 'Updated headache notes' }),
    });
    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 404 when note not found for update', async () => {
    (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/clinical-notes/note-1', {
      method: 'PATCH',
      body: JSON.stringify({ subjective: 'update' }),
    });
    const res = await PATCH(req, mockContext);

    expect(res.status).toBe(404);
  });

  it('returns 403 when editing a signed note', async () => {
    (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue({
      ...mockNote,
      signedAt: new Date(),
    });

    const req = new NextRequest('http://localhost:3000/api/clinical-notes/note-1', {
      method: 'PATCH',
      body: JSON.stringify({ subjective: 'update' }),
    });
    const res = await PATCH(req, mockContext);

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/clinical-notes/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes an unsigned note', async () => {
    (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue({
      ...mockNote,
      patient: { assignedClinicianId: 'clinician-1' },
    });
    (prisma.clinicalNote.delete as jest.Mock).mockResolvedValue({ id: 'note-1' });

    const req = new NextRequest('http://localhost:3000/api/clinical-notes/note-1', { method: 'DELETE' });
    const res = await DELETE(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 404 when note not found for deletion', async () => {
    (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/clinical-notes/note-1', { method: 'DELETE' });
    const res = await DELETE(req, mockContext);

    expect(res.status).toBe(404);
  });

  it('returns 403 when deleting a signed note as non-admin', async () => {
    (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue({
      ...mockNote,
      signedAt: new Date(),
      patient: { assignedClinicianId: 'clinician-1' },
    });

    const req = new NextRequest('http://localhost:3000/api/clinical-notes/note-1', { method: 'DELETE' });
    const res = await DELETE(req, mockContext);

    expect(res.status).toBe(403);
  });
});
