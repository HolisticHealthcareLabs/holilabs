import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    clinicalNote: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/clinical-notes/version-control', () => ({
  getNoteVersion: jest.fn(),
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');
const { getNoteVersion } = require('@/lib/clinical-notes/version-control');

const ctx = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  params: { id: 'note-abc', versionId: 'v2' },
};

const mockNote = { id: 'note-abc', patientId: 'patient-1' };
const mockVersion = {
  id: 'v2',
  noteId: 'note-abc',
  content: 'Patient presents with hypertension...',
  createdAt: new Date(),
  createdBy: 'clinician-1',
};

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue(mockNote);
  (getNoteVersion as jest.Mock).mockResolvedValue(mockVersion);
});

describe('GET /api/clinical-notes/[id]/versions/[versionId]', () => {
  it('returns the specific note version', async () => {
    const req = new NextRequest('http://localhost:3000/api/clinical-notes/note-abc/versions/v2');
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.noteId).toBe('note-abc');
    expect(json.data.patientId).toBe('patient-1');
    expect(json.data.version.id).toBe('v2');
  });

  it('returns 404 when the clinical note does not exist', async () => {
    (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/clinical-notes/nonexistent/versions/v1');
    const res = await GET(req, { ...ctx, params: { id: 'nonexistent', versionId: 'v1' } });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error).toMatch(/clinical note not found/i);
  });

  it('returns 404 when the version does not exist', async () => {
    (getNoteVersion as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/clinical-notes/note-abc/versions/v99');
    const res = await GET(req, { ...ctx, params: { id: 'note-abc', versionId: 'v99' } });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error).toMatch(/version not found/i);
  });
});
