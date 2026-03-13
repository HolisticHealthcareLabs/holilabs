import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    scribeSession: { findFirst: jest.fn() },
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

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  params: { id: 'session-1' },
  user: { id: 'doc-1', email: 'doc@test.com' },
};

const mockSession = {
  id: 'session-1',
  clinicianId: 'doc-1',
  patient: { id: 'p-1', firstName: 'Maria', lastName: 'Silva', mrn: 'MRN-1', dateOfBirth: new Date() },
  clinician: { id: 'doc-1', firstName: 'Dr', lastName: 'Test', specialty: 'GP' },
  transcription: { id: 't-1', rawText: 'transcript text' },
  soapNote: { id: 'sn-1', subjective: 'S', objective: 'O', assessment: 'A', plan: 'P' },
};

describe('GET /api/scribe/sessions/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns session with transcription and SOAP note', async () => {
    (prisma.scribeSession.findFirst as jest.Mock).mockResolvedValue(mockSession);

    const res = await GET(new NextRequest('http://localhost:3000/api/scribe/sessions/session-1'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('session-1');
    expect(data.data.transcription).toBeDefined();
    expect(data.data.soapNote).toBeDefined();
    expect(prisma.scribeSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'session-1', clinicianId: 'doc-1' },
      })
    );
  });

  it('returns 404 when session not found', async () => {
    (prisma.scribeSession.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await GET(new NextRequest('http://localhost:3000/api/scribe/sessions/session-1'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain('not found');
  });

  it('handles database errors gracefully', async () => {
    (prisma.scribeSession.findFirst as jest.Mock).mockRejectedValue(new Error('DB error'));

    const res = await GET(new NextRequest('http://localhost:3000/api/scribe/sessions/session-1'), mockContext);

    expect(res.status).toBe(500);
  });
});
