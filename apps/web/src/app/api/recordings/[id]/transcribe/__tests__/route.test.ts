import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    scribeSession: { findUnique: jest.fn(), update: jest.fn() },
    transcription: { upsert: jest.fn() },
    sOAPNote: { upsert: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    audio: {
      transcriptions: {
        create: jest.fn(),
      },
    },
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  }));
});

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn((err: any) =>
    require('next/server').NextResponse.json({ error: 'Internal error' }, { status: 500 })
  ),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const USER_ID = 'doc-1';
const mockContext = {
  user: { id: USER_ID, email: 'doc@test.com' },
  params: { id: 'recording-1' },
};

const mockRecording = {
  id: 'recording-1',
  patientId: 'patient-1',
  clinicianId: USER_ID,
  audioDuration: 300,
  appointment: { clinician: { id: USER_ID } },
  patient: {
    firstName: 'Jane',
    lastName: 'Doe',
    dateOfBirth: new Date('1980-01-01'),
    gender: 'F',
    allergies: [],
    diagnoses: [],
  },
};

describe('POST /api/recordings/[id]/transcribe', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns 400 for invalid request body (missing audioUrl)', async () => {
    const req = new NextRequest('http://localhost:3000/api/recordings/recording-1/transcribe', {
      method: 'POST',
      body: JSON.stringify({ generateSOAP: true }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Datos inválidos');
  });

  it('returns 404 when recording not found', async () => {
    (prisma.scribeSession.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/recordings/recording-1/transcribe', {
      method: 'POST',
      body: JSON.stringify({ audioUrl: 'https://storage.example.com/audio.webm', generateSOAP: false }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Grabación no encontrada');
  });

  it('returns 403 when user is not the recording owner', async () => {
    (prisma.scribeSession.findUnique as jest.Mock).mockResolvedValue({
      ...mockRecording,
      appointment: { clinician: { id: 'other-doc' } },
    });

    const req = new NextRequest('http://localhost:3000/api/recordings/recording-1/transcribe', {
      method: 'POST',
      body: JSON.stringify({ audioUrl: 'https://storage.example.com/audio.webm', generateSOAP: false }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain('permiso');
  });

  it('returns 503 when OpenAI API key is not configured', async () => {
    delete process.env.OPENAI_API_KEY;
    (prisma.scribeSession.findUnique as jest.Mock).mockResolvedValue(mockRecording);

    const req = new NextRequest('http://localhost:3000/api/recordings/recording-1/transcribe', {
      method: 'POST',
      body: JSON.stringify({ audioUrl: 'https://storage.example.com/audio.webm', generateSOAP: false }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.error).toContain('OpenAI API');
  });
});
