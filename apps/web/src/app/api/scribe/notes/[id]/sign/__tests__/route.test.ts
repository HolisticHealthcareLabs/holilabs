import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    sOAPNote: { findFirst: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockReturnValue(
    new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 })
  ),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  params: { id: 'note-1' },
  user: { id: 'doc-1', email: 'doc@test.com' },
};

const mockNote = {
  id: 'note-1',
  clinicianId: 'doc-1',
  status: 'DRAFT',
  noteHash: 'abc123',
};

describe('POST /api/scribe/notes/[id]/sign', () => {
  beforeEach(() => jest.clearAllMocks());

  it('signs SOAP note successfully', async () => {
    (prisma.sOAPNote.findFirst as jest.Mock).mockResolvedValue(mockNote);
    (prisma.sOAPNote.update as jest.Mock).mockResolvedValue({
      id: 'note-1',
      status: 'SIGNED',
      signedAt: new Date(),
      signedBy: 'doc-1',
    });
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/scribe/notes/note-1/sign', {
      method: 'POST',
      body: JSON.stringify({ signatureMethod: 'PIN', pin: '1234' }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.status).toBe('SIGNED');
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('returns 400 when signature method or PIN missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/scribe/notes/note-1/sign', {
      method: 'POST',
      body: JSON.stringify({ signatureMethod: 'PIN' }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('required');
  });

  it('returns 404 when note not found', async () => {
    (prisma.sOAPNote.findFirst as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/scribe/notes/note-1/sign', {
      method: 'POST',
      body: JSON.stringify({ signatureMethod: 'PIN', pin: '1234' }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain('not found');
  });

  it('returns 400 when note already signed', async () => {
    (prisma.sOAPNote.findFirst as jest.Mock).mockResolvedValue({ ...mockNote, status: 'SIGNED' });

    const req = new NextRequest('http://localhost:3000/api/scribe/notes/note-1/sign', {
      method: 'POST',
      body: JSON.stringify({ signatureMethod: 'PIN', pin: '1234' }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('already signed');
  });

  it('returns 400 for invalid PIN (too short)', async () => {
    (prisma.sOAPNote.findFirst as jest.Mock).mockResolvedValue(mockNote);

    const req = new NextRequest('http://localhost:3000/api/scribe/notes/note-1/sign', {
      method: 'POST',
      body: JSON.stringify({ signatureMethod: 'PIN', pin: '12' }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Invalid PIN');
  });
});
