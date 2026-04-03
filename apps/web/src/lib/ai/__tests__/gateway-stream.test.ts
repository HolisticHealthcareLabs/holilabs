export {};

/**
 * Tests for streamGateway() — compliance pipeline for streaming
 * Verifies: de-id before stream, audit logging, usage tracking
 * All data is synthetic — NO PHI
 */

jest.mock('@/lib/logger', () => {
  const logger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
  return { __esModule: true, default: logger };
});

jest.mock('@/lib/deid/transcript-gate', () => ({
  deidentifyTranscriptOrThrow: jest.fn((text: string) => Promise.resolve(text)),
}));

jest.mock('../usage-tracker', () => ({
  trackUsage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../chat', () => ({
  chat: jest.fn(),
  streamV2: jest.fn(),
}));

const { deidentifyTranscriptOrThrow } = require('@/lib/deid/transcript-gate');
const { trackUsage } = require('../usage-tracker');
const { streamV2 } = require('../chat');
const logger = require('@/lib/logger').default;
const { streamGateway } = require('../gateway');

beforeEach(() => {
  jest.clearAllMocks();
  // Reset de-id to passthrough
  (deidentifyTranscriptOrThrow as jest.Mock).mockImplementation(
    (text: string) => Promise.resolve(text),
  );
});

describe('streamGateway', () => {
  const baseRequest = {
    messages: [{ role: 'user' as const, content: 'summarize labs' }],
    provider: 'claude' as const,
    userId: 'doc-1',
    task: 'summary',
  };

  function mockStream(chunks: any[]) {
    (streamV2 as jest.Mock).mockReturnValue(
      (async function* () {
        for (const c of chunks) yield c;
      })(),
    );
  }

  it('de-identifies messages BEFORE streaming starts (RUTH invariant)', async () => {
    const callOrder: string[] = [];

    (deidentifyTranscriptOrThrow as jest.Mock).mockImplementation(async (text: string) => {
      callOrder.push('deid');
      return text.replace('PHI', '[REDACTED]');
    });

    (streamV2 as jest.Mock).mockImplementation(function* () {
      callOrder.push('stream_start');
      yield { type: 'text_delta', content: 'ok' };
      yield { type: 'done' };
    });

    const chunks: any[] = [];
    for await (const chunk of streamGateway({
      ...baseRequest,
      messages: [{ role: 'user', content: 'patient PHI data' }],
    })) {
      chunks.push(chunk);
    }

    expect(callOrder[0]).toBe('deid');
    expect(callOrder[1]).toBe('stream_start');
    expect(chunks).toHaveLength(2);
  });

  it('passes de-identified messages to streamV2', async () => {
    (deidentifyTranscriptOrThrow as jest.Mock).mockResolvedValue('CLEANED');

    mockStream([
      { type: 'text_delta', content: 'response' },
      { type: 'done' },
    ]);

    // Drain generator
    for await (const _ of streamGateway(baseRequest)) { /* consume */ }

    const streamCall = (streamV2 as jest.Mock).mock.calls[0][0];
    expect(streamCall.messages[0].content).toBe('CLEANED');
  });

  it('de-identifies system prompt when provided', async () => {
    (deidentifyTranscriptOrThrow as jest.Mock).mockImplementation(
      async (text: string) => text === 'sys with PHI' ? 'sys CLEANED' : text,
    );

    mockStream([{ type: 'done' }]);

    for await (const _ of streamGateway({
      ...baseRequest,
      systemPrompt: 'sys with PHI',
    })) { /* consume */ }

    const streamCall = (streamV2 as jest.Mock).mock.calls[0][0];
    expect(streamCall.systemPrompt).toBe('sys CLEANED');
  });

  it('skips de-id when skipDeId is true', async () => {
    mockStream([{ type: 'done' }]);

    for await (const _ of streamGateway({
      ...baseRequest,
      skipDeId: true,
    })) { /* consume */ }

    expect(deidentifyTranscriptOrThrow).not.toHaveBeenCalled();
  });

  it('yields all chunks from the provider stream', async () => {
    const expected = [
      { type: 'text_delta', content: 'Hello' },
      { type: 'text_delta', content: ' World' },
      { type: 'usage', usage: { promptTokens: 5, completionTokens: 3, totalTokens: 8 } },
      { type: 'done' },
    ];
    mockStream(expected);

    const chunks: any[] = [];
    for await (const chunk of streamGateway(baseRequest)) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(expected);
  });

  it('tracks usage after stream completes', async () => {
    mockStream([
      { type: 'usage', usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 } },
      { type: 'done' },
    ]);

    for await (const _ of streamGateway(baseRequest)) { /* consume */ }

    expect(trackUsage).toHaveBeenCalledTimes(1);
    const tracked = (trackUsage as jest.Mock).mock.calls[0][0];
    expect(tracked.provider).toBe('claude');
    expect(tracked.userId).toBe('doc-1');
    expect(tracked.totalTokens).toBe(15);
    expect(tracked.feature).toBe('summary');
  });

  it('logs audit start and completion events', async () => {
    mockStream([{ type: 'done' }]);

    for await (const _ of streamGateway(baseRequest)) { /* consume */ }

    const infoCalls = (logger.info as jest.Mock).mock.calls.map((c: any[]) => c[0].event);
    expect(infoCalls).toContain('ai_stream_gateway_start');
    expect(infoCalls).toContain('ai_stream_gateway_complete');
  });

  it('does not track usage when userId is absent', async () => {
    mockStream([{ type: 'done' }]);

    const requestNoUser = { ...baseRequest, userId: undefined };
    for await (const _ of streamGateway(requestNoUser)) { /* consume */ }

    expect(trackUsage).not.toHaveBeenCalled();
  });

  it('does not throw when usage tracking fails (non-fatal)', async () => {
    mockStream([
      { type: 'usage', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 } },
      { type: 'done' },
    ]);
    (trackUsage as jest.Mock).mockRejectedValue(new Error('Redis down'));

    const chunks: any[] = [];
    for await (const chunk of streamGateway(baseRequest)) {
      chunks.push(chunk);
    }

    // Stream should still complete despite tracking failure
    expect(chunks[chunks.length - 1].type).toBe('done');
  });
});
