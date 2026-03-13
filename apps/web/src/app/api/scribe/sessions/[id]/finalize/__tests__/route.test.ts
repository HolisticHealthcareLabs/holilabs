import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    scribeSession: { findFirst: jest.fn(), update: jest.fn() },
    transcription: { findUnique: jest.fn(), upsert: jest.fn() },
    sOAPNote: { create: jest.fn() },
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

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(),
  GetObjectCommand: jest.fn(),
}));

jest.mock('@/lib/security/encryption', () => ({
  decryptBuffer: jest.fn().mockReturnValue(Buffer.from('audio')),
}));

jest.mock('@/lib/validation/schemas', () => ({
  CreateSOAPNoteSchema: { parse: jest.fn((d: any) => d) },
}));

jest.mock('zod', () => ({
  z: { ZodError: class ZodError extends Error { errors: any[] = []; } },
}));

jest.mock('@/lib/transcription/deepgram', () => ({
  transcribeAudioWithDeepgram: jest.fn(),
}));

jest.mock('@/lib/analytics/server-analytics', () => ({
  trackEvent: jest.fn().mockResolvedValue(undefined),
  ServerAnalyticsEvents: {
    SCRIBE_TRANSCRIPTION_GENERATED: 'SCRIBE_TRANSCRIPTION_GENERATED',
    SCRIBE_SOAP_GENERATED: 'SCRIBE_SOAP_GENERATED',
    SCRIBE_SESSION_COMPLETED: 'SCRIBE_SESSION_COMPLETED',
  },
}));

jest.mock('@anthropic-ai/sdk', () => jest.fn());

jest.mock('@/lib/deid/transcript-gate', () => ({
  deidentifyTranscriptOrThrow: jest.fn().mockResolvedValue('de-identified transcript'),
}));

jest.mock('@/lib/patients/dossier-queue', () => ({
  enqueuePatientDossierJob: jest.fn().mockResolvedValue(undefined),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  params: { id: 'session-1' },
  user: { id: 'doc-1', email: 'doc@test.com' },
};

describe('POST /api/scribe/sessions/[id]/finalize', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 when session not found', async () => {
    (prisma.scribeSession.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.transcription.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await POST(new NextRequest('http://localhost:3000/api/scribe/sessions/session-1/finalize', { method: 'POST' }), mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain('not found');
  });

  it('returns 400 when session already completed', async () => {
    (prisma.scribeSession.findFirst as jest.Mock).mockResolvedValue({
      id: 'session-1',
      clinicianId: 'doc-1',
      status: 'COMPLETED',
      audioFileUrl: 'url',
      audioFileName: 'file.wav',
      patient: { country: 'BR', dateOfBirth: new Date('1990-01-01') },
      clinician: { firstName: 'Dr', lastName: 'Test', specialty: 'GP' },
    });
    (prisma.transcription.findUnique as jest.Mock).mockResolvedValue({ rawText: 'existing transcript', segments: [] });

    const res = await POST(new NextRequest('http://localhost:3000/api/scribe/sessions/session-1/finalize', { method: 'POST' }), mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('already finalized');
  });

  it('returns 400 when no audio and no transcript', async () => {
    (prisma.scribeSession.findFirst as jest.Mock).mockResolvedValue({
      id: 'session-1',
      clinicianId: 'doc-1',
      status: 'RECORDING',
      audioFileUrl: null,
      audioFileName: null,
      patient: { country: 'BR', dateOfBirth: new Date('1990-01-01') },
      clinician: { firstName: 'Dr', lastName: 'Test', specialty: 'GP' },
    });
    (prisma.transcription.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await POST(new NextRequest('http://localhost:3000/api/scribe/sessions/session-1/finalize', { method: 'POST' }), mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('No audio file');
  });

  it('finalizes with existing transcript when ANTHROPIC_API_KEY is missing', async () => {
    const originalKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    (prisma.scribeSession.findFirst as jest.Mock).mockResolvedValue({
      id: 'session-1',
      clinicianId: 'doc-1',
      patientId: 'p-1',
      status: 'RECORDING',
      audioFileUrl: null,
      audioFileName: null,
      patient: { country: 'BR', dateOfBirth: new Date('1990-01-01') },
      clinician: { firstName: 'Dr', lastName: 'Test', specialty: 'GP' },
    });
    (prisma.transcription.findUnique as jest.Mock).mockResolvedValue({
      id: 'tr-1',
      rawText: 'existing de-identified transcript',
      segments: [],
      speakerCount: 2,
      confidence: 0.95,
      language: 'pt',
      durationSeconds: 120,
      processingTime: 500,
      wordCount: 50,
    });
    (prisma.scribeSession.update as jest.Mock).mockResolvedValue({ id: 'session-1', status: 'COMPLETED' });

    const res = await POST(new NextRequest('http://localhost:3000/api/scribe/sessions/session-1/finalize', { method: 'POST' }), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.soapNote).toBeNull();
    expect(data.data.warning).toContain('SOAP generation skipped');

    process.env.ANTHROPIC_API_KEY = originalKey;
  });
});
