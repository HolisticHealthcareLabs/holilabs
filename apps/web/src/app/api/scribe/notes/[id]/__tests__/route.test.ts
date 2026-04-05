import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    sOAPNote: { findFirst: jest.fn(), update: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const mockSafeErrorResponse = jest.fn();
jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: (...args: any[]) => mockSafeErrorResponse(...args),
}));

jest.mock('@/lib/validation/schemas', () => ({
  UpdateSOAPNoteSchema: {
    parse: (d: any) => d,
  },
}));

const { GET, PATCH } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  params: { id: 'note-1' },
  user: { id: 'doc-1', email: 'doc@test.com' },
};

const mockNote = {
  id: 'note-1',
  clinicianId: 'doc-1',
  patientId: 'p-1',
  status: 'DRAFT',
  editCount: 0,
  editHistory: [],
  subjective: 'Patient reports headache',
  objective: 'BP 120/80',
  assessment: 'Tension headache',
  plan: 'Acetaminophen 500mg',
  chiefComplaint: 'Headache',
  diagnoses: [],
  procedures: [],
  medications: [],
  vitalSigns: {},
  patient: { id: 'p-1', firstName: 'Maria', lastName: 'Silva', mrn: 'MRN-1', tokenId: 'tok-1', dateOfBirth: new Date() },
  clinician: { id: 'doc-1', firstName: 'Dr', lastName: 'Test', specialty: 'GP' },
  session: { id: 'session-1', audioDuration: 300, createdAt: new Date() },
};

describe('GET /api/scribe/notes/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { NextResponse } = require('next/server');
    mockSafeErrorResponse.mockReturnValue(
      NextResponse.json({ error: 'Internal error' }, { status: 500 })
    );
  });

  it('returns SOAP note with details', async () => {
    (prisma.sOAPNote.findFirst as jest.Mock).mockResolvedValue(mockNote);

    const res = await GET(new NextRequest('http://localhost:3000/api/scribe/notes/note-1'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('note-1');
    expect(data.data.subjective).toBe('Patient reports headache');
  });

  it('returns 404 when note not found', async () => {
    (prisma.sOAPNote.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await GET(new NextRequest('http://localhost:3000/api/scribe/notes/note-1'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain('not found');
  });
});

describe('PATCH /api/scribe/notes/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { NextResponse } = require('next/server');
    mockSafeErrorResponse.mockReturnValue(
      NextResponse.json({ error: 'Internal error' }, { status: 500 })
    );
  });

  it('updates SOAP note fields', async () => {
    (prisma.sOAPNote.findFirst as jest.Mock).mockResolvedValue(mockNote);
    (prisma.sOAPNote.update as jest.Mock).mockResolvedValue({ ...mockNote, subjective: 'Updated S' });

    const req = new NextRequest('http://localhost:3000/api/scribe/notes/note-1', {
      method: 'PATCH',
      body: JSON.stringify({ subjective: 'Updated S' }),
    });

    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.sOAPNote.update).toHaveBeenCalled();
  });

  it('returns 404 when note not found for update', async () => {
    (prisma.sOAPNote.findFirst as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/scribe/notes/note-1', {
      method: 'PATCH',
      body: JSON.stringify({ subjective: 'Updated S' }),
    });

    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain('not found');
  });

  it('returns 400 when editing signed note', async () => {
    (prisma.sOAPNote.findFirst as jest.Mock).mockResolvedValue({ ...mockNote, status: 'SIGNED' });

    const req = new NextRequest('http://localhost:3000/api/scribe/notes/note-1', {
      method: 'PATCH',
      body: JSON.stringify({ subjective: 'Updated S' }),
    });

    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('signed');
  });
});
