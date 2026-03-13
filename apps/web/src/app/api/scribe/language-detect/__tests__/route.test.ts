import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn(),
}));
jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn(),
}));
jest.mock('@deepgram/sdk', () => ({
  createClient: jest.fn(),
}));

const { GET, POST } = require('../route');
const { createClient } = require('@deepgram/sdk');

const mockContext = {
  user: { id: 'user-1', email: 'dr@test.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('GET /api/scribe/language-detect', () => {
  it('returns usage instructions', async () => {
    const req = new NextRequest('http://localhost:3000/api/scribe/language-detect');
    const res = await GET(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
  });
});

describe('POST /api/scribe/language-detect', () => {
  const originalKey = process.env.DEEPGRAM_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DEEPGRAM_API_KEY = 'test-key';
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.DEEPGRAM_API_KEY;
    else process.env.DEEPGRAM_API_KEY = originalKey;
  });

  it('detects language from audio buffer', async () => {
    createClient.mockReturnValue({
      listen: {
        prerecorded: {
          transcribeFile: jest.fn().mockResolvedValue({
            result: {
              metadata: { detected_language: 'pt', language_confidence: 0.95 },
              results: { channels: [] },
            },
            error: null,
          }),
        },
      },
    });
    const pcmBuffer = Buffer.alloc(16000);
    const req = new NextRequest('http://localhost:3000/api/scribe/language-detect', {
      method: 'POST',
      body: pcmBuffer,
      headers: { 'Content-Type': 'application/octet-stream' },
    });
    const res = await POST(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(['en', 'es', 'pt']).toContain(data.language);
  });

  it('returns en for audio that is too short', async () => {
    const tinyBuffer = Buffer.alloc(100);
    const req = new NextRequest('http://localhost:3000/api/scribe/language-detect', {
      method: 'POST',
      body: tinyBuffer,
      headers: { 'Content-Type': 'application/octet-stream' },
    });
    const res = await POST(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.language).toBe('en');
    expect(data.raw).toBe('too_short');
  });

  it('returns 400 for invalid sampleRate', async () => {
    const pcmBuffer = Buffer.alloc(16000);
    const req = new NextRequest('http://localhost:3000/api/scribe/language-detect?sampleRate=-1', {
      method: 'POST',
      body: pcmBuffer,
      headers: { 'Content-Type': 'application/octet-stream' },
    });
    const res = await POST(req, mockContext);
    expect(res.status).toBe(400);
  });

  it('returns 500 when DEEPGRAM_API_KEY is not configured', async () => {
    delete process.env.DEEPGRAM_API_KEY;
    const pcmBuffer = Buffer.alloc(16000);
    const req = new NextRequest('http://localhost:3000/api/scribe/language-detect', {
      method: 'POST',
      body: pcmBuffer,
      headers: { 'Content-Type': 'application/octet-stream' },
    });
    const res = await POST(req, mockContext);
    expect(res.status).toBe(500);
  });
});
