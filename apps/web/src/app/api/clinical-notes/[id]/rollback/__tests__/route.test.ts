import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    clinicalNote: { findUnique: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('@/lib/clinical-notes/version-control', () => ({
  rollbackToVersion: jest.fn(),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { rollbackToVersion } = require('@/lib/clinical-notes/version-control');

const mockContext = {
  user: { id: 'admin-1', email: 'admin@holilabs.com', role: 'ADMIN' },
  params: { id: 'note-1' },
  requestId: 'req-1',
};

describe('POST /api/clinical-notes/[id]/rollback', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rolls back a note to previous version', async () => {
    (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue({
      id: 'note-1',
      patientId: 'p1',
      authorId: 'clinician-1',
    });
    (rollbackToVersion as jest.Mock).mockResolvedValue({
      id: 'note-1',
      subjective: 'Original text',
    });
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({ id: 'audit-1' });

    const req = new NextRequest('http://localhost:3000/api/clinical-notes/note-1/rollback', {
      method: 'POST',
      headers: { 'x-user-id': 'admin-1' },
      body: JSON.stringify({ versionId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx', reason: 'Incorrect edit' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 404 when note does not exist', async () => {
    (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/clinical-notes/note-1/rollback', {
      method: 'POST',
      headers: { 'x-user-id': 'admin-1' },
      body: JSON.stringify({ versionId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
  });

  it('returns 401 when x-user-id header is missing', async () => {
    (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue({
      id: 'note-1',
      patientId: 'p1',
      authorId: 'clinician-1',
    });

    const req = new NextRequest('http://localhost:3000/api/clinical-notes/note-1/rollback', {
      method: 'POST',
      body: JSON.stringify({ versionId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(401);
  });

  it('returns 500 when rollback fails', async () => {
    (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue({
      id: 'note-1',
      patientId: 'p1',
      authorId: 'clinician-1',
    });
    (rollbackToVersion as jest.Mock).mockRejectedValue(new Error('Version not found'));

    const req = new NextRequest('http://localhost:3000/api/clinical-notes/note-1/rollback', {
      method: 'POST',
      headers: { 'x-user-id': 'admin-1' },
      body: JSON.stringify({ versionId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toContain('Version not found');
  });
});
