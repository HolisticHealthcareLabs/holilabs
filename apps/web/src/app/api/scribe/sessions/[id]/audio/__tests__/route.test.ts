import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn(),
}));
jest.mock('@/lib/logger', () => ({ __esModule: true, default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    scribeSession: { findFirst: jest.fn(), update: jest.fn() },
  },
}));
jest.mock('@/lib/security/encryption', () => ({
  encryptBuffer: jest.fn(),
}));
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(),
  PutObjectCommand: jest.fn(),
}));
jest.mock('@/lib/analytics/server-analytics', () => ({
  trackEvent: jest.fn(),
  ServerAnalyticsEvents: { SCRIBE_AUDIO_UPLOADED: 'SCRIBE_AUDIO_UPLOADED' },
}));
jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn(),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { encryptBuffer } = require('@/lib/security/encryption');
const { S3Client } = require('@aws-sdk/client-s3');
const { trackEvent } = require('@/lib/analytics/server-analytics');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@test.com', role: 'CLINICIAN' },
  requestId: 'req-1',
  params: { id: 'sess-1' },
};

const mockSession = {
  id: 'sess-1',
  clinicianId: 'clinician-1',
  patientId: 'patient-1',
  status: 'RECORDING',
};

describe('POST /api/scribe/sessions/[id]/audio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.R2_ACCESS_KEY_ID = 'test-key';
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
    process.env.R2_ENDPOINT = 'https://r2.example.com';
    process.env.R2_BUCKET = 'test-bucket';
  });

  afterEach(() => {
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.R2_ENDPOINT;
    delete process.env.R2_BUCKET;
  });

  it('uploads audio and returns success', async () => {
    prisma.scribeSession.findFirst.mockResolvedValue(mockSession);
    prisma.scribeSession.update.mockResolvedValue({ ...mockSession, status: 'PROCESSING' });
    encryptBuffer.mockReturnValue(Buffer.from('encrypted-data'));
    S3Client.mockImplementation(() => ({ send: jest.fn().mockResolvedValue({}) }));
    trackEvent.mockResolvedValue(undefined);

    const audioFile = new File([Buffer.alloc(1024)], 'recording.webm', { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('audio', audioFile);
    formData.append('duration', '30');
    const req = new NextRequest('http://localhost:3000/api/scribe/sessions/sess-1/audio', {
      method: 'POST',
      body: formData,
    });
    const res = await POST(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 404 when session not found', async () => {
    prisma.scribeSession.findFirst.mockResolvedValue(null);
    const audioFile = new File([Buffer.alloc(1024)], 'recording.webm', { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('audio', audioFile);
    const req = new NextRequest('http://localhost:3000/api/scribe/sessions/nonexistent/audio', {
      method: 'POST',
      body: formData,
    });
    const res = await POST(req, mockContext);
    expect(res.status).toBe(404);
  });

  it('returns 400 when no audio file provided', async () => {
    prisma.scribeSession.findFirst.mockResolvedValue(mockSession);
    const formData = new FormData();
    formData.append('duration', '30');
    const req = new NextRequest('http://localhost:3000/api/scribe/sessions/sess-1/audio', {
      method: 'POST',
      body: formData,
    });
    const res = await POST(req, mockContext);
    expect(res.status).toBe(400);
  });

  it('returns 400 when file type is not audio', async () => {
    prisma.scribeSession.findFirst.mockResolvedValue(mockSession);
    const wrongFile = new File([Buffer.alloc(1024)], 'image.jpg', { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('audio', wrongFile);
    const req = new NextRequest('http://localhost:3000/api/scribe/sessions/sess-1/audio', {
      method: 'POST',
      body: formData,
    });
    const res = await POST(req, mockContext);
    expect(res.status).toBe(400);
  });
});
