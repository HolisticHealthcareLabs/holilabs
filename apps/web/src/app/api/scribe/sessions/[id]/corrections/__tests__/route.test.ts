import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    scribeSession: { findFirst: jest.fn() },
    transcription: { update: jest.fn() },
    transcriptionError: { create: jest.fn() },
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
  params: { id: 'session-1' },
  user: { id: 'doc-1', email: 'doc@test.com' },
};

const mockSessionWithTranscription = {
  id: 'session-1',
  clinicianId: 'doc-1',
  transcription: {
    id: 'tr-1',
    segments: [
      { text: 'hello world', speaker: 0, startTime: 0, endTime: 1 },
      { text: 'second segment', speaker: 1, startTime: 1, endTime: 2 },
    ],
  },
};

describe('POST /api/scribe/sessions/[id]/corrections', () => {
  beforeEach(() => jest.clearAllMocks());

  it('saves correction and logs transcription error', async () => {
    (prisma.scribeSession.findFirst as jest.Mock).mockResolvedValue(mockSessionWithTranscription);
    (prisma.transcription.update as jest.Mock).mockResolvedValue({});
    (prisma.transcriptionError.create as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/scribe/sessions/session-1/corrections', {
      method: 'POST',
      body: JSON.stringify({
        segmentIndex: 0,
        originalText: 'hello world',
        correctedText: 'hello world!',
        confidence: 0.9,
        speaker: 0,
        startTime: 0,
        endTime: 1,
      }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.correctedText).toBe('hello world!');
    expect(prisma.transcription.update).toHaveBeenCalled();
    expect(prisma.transcriptionError.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sessionId: 'session-1',
          segmentIndex: 0,
          originalText: 'hello world',
          correctedText: 'hello world!',
        }),
      })
    );
  });

  it('returns 400 for missing required fields', async () => {
    const req = new NextRequest('http://localhost:3000/api/scribe/sessions/session-1/corrections', {
      method: 'POST',
      body: JSON.stringify({ segmentIndex: 0 }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Missing required fields');
  });

  it('returns 404 when session not found', async () => {
    (prisma.scribeSession.findFirst as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/scribe/sessions/session-1/corrections', {
      method: 'POST',
      body: JSON.stringify({
        segmentIndex: 0,
        originalText: 'hello',
        correctedText: 'hello!',
        confidence: 0.9,
      }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain('not found');
  });

  it('returns 404 when no transcription exists', async () => {
    (prisma.scribeSession.findFirst as jest.Mock).mockResolvedValue({
      ...mockSessionWithTranscription,
      transcription: null,
    });

    const req = new NextRequest('http://localhost:3000/api/scribe/sessions/session-1/corrections', {
      method: 'POST',
      body: JSON.stringify({
        segmentIndex: 0,
        originalText: 'hello',
        correctedText: 'hello!',
        confidence: 0.9,
      }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain('No transcription');
  });

  it('returns 400 for invalid segment index', async () => {
    (prisma.scribeSession.findFirst as jest.Mock).mockResolvedValue(mockSessionWithTranscription);

    const req = new NextRequest('http://localhost:3000/api/scribe/sessions/session-1/corrections', {
      method: 'POST',
      body: JSON.stringify({
        segmentIndex: 99,
        originalText: 'hello',
        correctedText: 'hello!',
        confidence: 0.9,
      }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Invalid segment index');
  });
});
