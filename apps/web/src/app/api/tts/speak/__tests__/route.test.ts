/**
 * Tests for POST /api/tts/speak
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/voice/elevenlabs', () => ({
  isElevenLabsConfigured: jest.fn(),
  synthesizeSpeech: jest.fn(),
}));

const { POST } = require('../route');
const { isElevenLabsConfigured, synthesizeSpeech } = require('@/lib/voice/elevenlabs');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

function makeReadableStream(data: string) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(data));
      controller.close();
    },
  });
}

describe('POST /api/tts/speak', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 501 when ElevenLabs is not configured', async () => {
    (isElevenLabsConfigured as jest.Mock).mockReturnValue(false);

    const req = new NextRequest('http://localhost:3000/api/tts/speak', {
      method: 'POST',
      body: JSON.stringify({ text: 'Hola' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(501);
    expect(data.fallback).toBe('browser');
    expect(synthesizeSpeech).not.toHaveBeenCalled();
  });

  it('returns 400 when text is empty', async () => {
    (isElevenLabsConfigured as jest.Mock).mockReturnValue(true);

    const req = new NextRequest('http://localhost:3000/api/tts/speak', {
      method: 'POST',
      body: JSON.stringify({ text: '   ' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('text is required');
    expect(synthesizeSpeech).not.toHaveBeenCalled();
  });

  it('returns 400 when text exceeds 4096 characters', async () => {
    (isElevenLabsConfigured as jest.Mock).mockReturnValue(true);

    const req = new NextRequest('http://localhost:3000/api/tts/speak', {
      method: 'POST',
      body: JSON.stringify({ text: 'A'.repeat(4097) }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('4096');
  });

  it('streams audio/mpeg when synthesis succeeds', async () => {
    (isElevenLabsConfigured as jest.Mock).mockReturnValue(true);
    (synthesizeSpeech as jest.Mock).mockResolvedValue({
      body: makeReadableStream('fake-audio-bytes'),
    });

    const req = new NextRequest('http://localhost:3000/api/tts/speak', {
      method: 'POST',
      body: JSON.stringify({ text: 'Buenos días, María', voice: 'doctor', language: 'es' }),
    });
    const res = await POST(req, mockContext);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('audio/mpeg');
    expect(synthesizeSpeech).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Buenos días, María', language: 'es' })
    );
  });

  it('returns 504 when ElevenLabs request times out', async () => {
    (isElevenLabsConfigured as jest.Mock).mockReturnValue(true);
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    (synthesizeSpeech as jest.Mock).mockRejectedValue(abortError);

    const req = new NextRequest('http://localhost:3000/api/tts/speak', {
      method: 'POST',
      body: JSON.stringify({ text: 'Hola', voice: 'patient' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(504);
    expect(data.error).toContain('timed out');
    expect(data.fallback).toBe('browser');
  });

  it('returns 502 on non-timeout upstream error', async () => {
    (isElevenLabsConfigured as jest.Mock).mockReturnValue(true);
    (synthesizeSpeech as jest.Mock).mockRejectedValue(new Error('upstream 500'));

    const req = new NextRequest('http://localhost:3000/api/tts/speak', {
      method: 'POST',
      body: JSON.stringify({ text: 'Hola' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data.error).toContain('upstream error');
    expect(data.fallback).toBe('browser');
  });
});
