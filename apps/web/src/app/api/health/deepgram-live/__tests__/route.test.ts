import { NextRequest } from 'next/server';
import { EventEmitter } from 'events';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any, _opts?: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

// MedicalAudioStreamer mock — emits events synchronously via EventEmitter
class MockStreamer extends EventEmitter {
  startStream = jest.fn().mockResolvedValue(undefined);
  stop = jest.fn().mockResolvedValue(undefined);
}

let mockStreamerInstance: MockStreamer;

jest.mock('@/lib/transcription/MedicalAudioStreamer', () => ({
  MedicalAudioStreamer: jest.fn().mockImplementation(() => {
    mockStreamerInstance = new MockStreamer();
    return mockStreamerInstance;
  }),
}));

const { GET } = require('../route');

describe('GET /api/health/deepgram-live', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DEEPGRAM_API_KEY = 'test-dg-key';
  });

  afterEach(() => {
    delete process.env.DEEPGRAM_API_KEY;
  });

  it('returns 500 when DEEPGRAM_API_KEY is not configured', async () => {
    delete process.env.DEEPGRAM_API_KEY;
    const req = new NextRequest('http://localhost:3000/api/health/deepgram-live');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.ok).toBe(false);
    expect(data.error).toContain('DEEPGRAM_API_KEY');
  });

  it('returns healthy status when websocket opens successfully', async () => {
    const { MedicalAudioStreamer } = require('@/lib/transcription/MedicalAudioStreamer');

    MedicalAudioStreamer.mockImplementation(() => {
      const streamer = new MockStreamer();
      streamer.startStream = jest.fn().mockImplementation(() => {
        setTimeout(() => streamer.emit('open', { requestId: 'req-1', model: 'nova-2' }), 0);
        return Promise.resolve();
      });
      streamer.stop = jest.fn().mockResolvedValue(undefined);
      return streamer;
    });

    const req = new NextRequest('http://localhost:3000/api/health/deepgram-live');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.status).toBe('healthy');
  });

  it('returns 500 when websocket emits an error event', async () => {
    const { MedicalAudioStreamer } = require('@/lib/transcription/MedicalAudioStreamer');

    MedicalAudioStreamer.mockImplementation(() => {
      const streamer = new MockStreamer();
      streamer.startStream = jest.fn().mockImplementation(() => {
        setTimeout(() => streamer.emit('error', { message: 'Auth failed' }), 0);
        return Promise.resolve();
      });
      streamer.stop = jest.fn().mockResolvedValue(undefined);
      return streamer;
    });

    const req = new NextRequest('http://localhost:3000/api/health/deepgram-live');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.ok).toBe(false);
  });

  it('returns 500 when startStream rejects immediately', async () => {
    const { MedicalAudioStreamer } = require('@/lib/transcription/MedicalAudioStreamer');

    MedicalAudioStreamer.mockImplementation(() => {
      const streamer = new MockStreamer();
      streamer.startStream = jest.fn().mockRejectedValue(new Error('Connection refused'));
      streamer.stop = jest.fn().mockResolvedValue(undefined);
      return streamer;
    });

    const req = new NextRequest('http://localhost:3000/api/health/deepgram-live');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.ok).toBe(false);
  });
});
