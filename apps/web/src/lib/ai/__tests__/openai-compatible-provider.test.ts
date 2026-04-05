/**
 * Tests for OpenAICompatibleProvider base class
 * All data is synthetic — NO PHI
 */

jest.mock('@/lib/logger', () => {
  const logger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };
  return { __esModule: true, default: logger };
});

const { OpenAICompatibleProvider } = require('../providers/openai-compatible-provider');

// Store original fetch
const originalFetch = global.fetch;

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  global.fetch = originalFetch;
});

function mockFetch(data: unknown, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  }) as any;
}

function makeProvider(overrides: Record<string, unknown> = {}) {
  return new OpenAICompatibleProvider({
    apiKey: 'test-key',
    baseUrl: 'https://api.test.ai/v1',
    defaultModel: 'test-model',
    providerId: 'test',
    ...overrides,
  });
}

const MOCK_RESPONSE = {
  id: 'chatcmpl-1',
  model: 'test-model',
  choices: [{
    index: 0,
    message: { role: 'assistant', content: 'Hello back!' },
    finish_reason: 'stop',
  }],
  usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
};

describe('OpenAICompatibleProvider', () => {
  it('throws if API key is empty', () => {
    expect(() => makeProvider({ apiKey: '' })).toThrow('test API key is required');
  });

  it('exposes correct metadata', () => {
    const p = makeProvider();
    expect(p.providerId).toBe('test');
    expect(p.defaultModel).toBe('test-model');
    expect(p.supportsStreaming).toBe(true);
    expect(p.supportsToolCalls).toBe(true);
  });

  describe('chat()', () => {
    it('sends correct request and parses response', async () => {
      mockFetch(MOCK_RESPONSE);
      const p = makeProvider();

      const result = await p.chat({
        messages: [{ role: 'user', content: 'Hello' }],
        systemPrompt: 'Be helpful',
        temperature: 0.5,
        maxTokens: 100,
      });

      expect(result.content).toBe('Hello back!');
      expect(result.model).toBe('test-model');
      expect(result.finishReason).toBe('stop');
      expect(result.usage).toEqual({
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      });

      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe('https://api.test.ai/v1/chat/completions');

      const body = JSON.parse(options.body);
      expect(body.model).toBe('test-model');
      expect(body.messages[0]).toEqual({ role: 'system', content: 'Be helpful' });
      expect(body.messages[1]).toEqual({ role: 'user', content: 'Hello' });
      expect(body.temperature).toBe(0.5);
      expect(body.max_tokens).toBe(100);
    });

    it('uses custom model when provided', async () => {
      mockFetch({ ...MOCK_RESPONSE, model: 'custom-model' });
      const p = makeProvider();

      const result = await p.chat({
        messages: [{ role: 'user', content: 'Hi' }],
        model: 'custom-model',
      });

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.model).toBe('custom-model');
      expect(result.model).toBe('custom-model');
    });

    it('passes tools as OpenAI function format', async () => {
      mockFetch({
        ...MOCK_RESPONSE,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: '',
            tool_calls: [{
              id: 'call-1',
              type: 'function',
              function: { name: 'get_weather', arguments: '{"city":"SP"}' },
            }],
          },
          finish_reason: 'tool_calls',
        }],
      });

      const p = makeProvider();
      const result = await p.chat({
        messages: [{ role: 'user', content: 'Weather in SP?' }],
        tools: [{
          name: 'get_weather',
          description: 'Get weather',
          parameters: { type: 'object', properties: { city: { type: 'string' } } },
        }],
      });

      expect(result.finishReason).toBe('tool_calls');
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls![0]).toEqual({
        id: 'call-1',
        name: 'get_weather',
        arguments: { city: 'SP' },
      });
    });

    it('sends response_format for JSON mode', async () => {
      mockFetch(MOCK_RESPONSE);
      const p = makeProvider();

      await p.chat({
        messages: [{ role: 'user', content: 'JSON please' }],
        responseFormat: 'json',
      });

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.response_format).toEqual({ type: 'json_object' });
    });

    it('throws on API error', async () => {
      mockFetch({ error: 'rate limited' }, 429);
      const p = makeProvider();

      await expect(
        p.chat({ messages: [{ role: 'user', content: 'Hi' }] }),
      ).rejects.toThrow('test API error: 429');
    });
  });

  describe('healthCheck()', () => {
    it('returns true when /models responds OK', async () => {
      mockFetch({ data: [{ id: 'model-1' }] });
      const p = makeProvider();
      expect(await p.healthCheck()).toBe(true);
    });

    it('returns false on error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('network')) as any;
      const p = makeProvider();
      expect(await p.healthCheck()).toBe(false);
    });
  });

  describe('generateResponse() (legacy)', () => {
    it('delegates to chat() and returns content string', async () => {
      mockFetch(MOCK_RESPONSE);
      const p = makeProvider();

      const result = await p.generateResponse('Hello');
      expect(result).toBe('Hello back!');
    });
  });
});
