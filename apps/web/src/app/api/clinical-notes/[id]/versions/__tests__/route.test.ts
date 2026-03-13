import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    clinicalNote: { findUnique: jest.fn() },
  },
}));

jest.mock('@/lib/clinical-notes/version-control', () => ({
  getNoteVersions: jest.fn(),
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');
const { getNoteVersions } = require('@/lib/clinical-notes/version-control');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  params: { id: 'note-1' },
  requestId: 'req-1',
};

describe('GET /api/clinical-notes/[id]/versions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns version history for a note', async () => {
    (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue({
      id: 'note-1',
      patientId: 'p1',
    });
    (getNoteVersions as jest.Mock).mockResolvedValue([
      { id: 'v1', versionNumber: 1 },
      { id: 'v2', versionNumber: 2 },
    ]);

    const req = new NextRequest('http://localhost:3000/api/clinical-notes/note-1/versions');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.totalVersions).toBe(2);
  });

  it('returns 404 when note not found', async () => {
    (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/clinical-notes/unknown/versions');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain('not found');
  });

  it('returns empty version list for new note', async () => {
    (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue({
      id: 'note-1',
      patientId: 'p1',
    });
    (getNoteVersions as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost:3000/api/clinical-notes/note-1/versions');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.totalVersions).toBe(0);
  });
});
