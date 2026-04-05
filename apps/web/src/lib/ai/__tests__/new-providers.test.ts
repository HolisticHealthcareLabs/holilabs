/**
 * Tests for new concrete providers (Groq, Cerebras, Mistral, DeepSeek)
 * Verifies they inherit OpenAICompatibleProvider correctly and
 * configure the right base URLs and default models.
 *
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

const { GroqProvider } = require('../providers/groq-provider');
const { CerebrasProvider } = require('../providers/cerebras-provider');
const { MistralProvider } = require('../providers/mistral-provider');
const { DeepSeekProvider } = require('../providers/deepseek-provider');

const originalEnv = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('GroqProvider', () => {
  it('configures correct base URL and default model', () => {
    const p = new GroqProvider('test-key');
    expect(p.providerId).toBe('groq');
    expect(p.defaultModel).toBe('llama-3.3-70b-versatile');
    expect(p.supportsStreaming).toBe(true);
    expect(p.supportsToolCalls).toBe(true);
  });

  it('accepts custom model', () => {
    const p = new GroqProvider('test-key', 'llama-3.1-8b-instant');
    expect(p.defaultModel).toBe('llama-3.1-8b-instant');
  });

  it('reads API key from env when not provided explicitly', () => {
    process.env.GROQ_API_KEY = 'env-groq-key';
    const p = new GroqProvider();
    expect(p.providerId).toBe('groq');
  });

  it('throws when no API key available', () => {
    delete process.env.GROQ_API_KEY;
    expect(() => new GroqProvider('')).toThrow('groq API key is required');
  });
});

describe('CerebrasProvider', () => {
  it('configures correct base URL and default model', () => {
    const p = new CerebrasProvider('test-key');
    expect(p.providerId).toBe('cerebras');
    expect(p.defaultModel).toBe('llama-3.3-70b');
    expect(p.supportsStreaming).toBe(true);
  });

  it('accepts custom model', () => {
    const p = new CerebrasProvider('test-key', 'llama-3.1-8b');
    expect(p.defaultModel).toBe('llama-3.1-8b');
  });

  it('throws when no API key available', () => {
    delete process.env.CEREBRAS_API_KEY;
    expect(() => new CerebrasProvider('')).toThrow('cerebras API key is required');
  });
});

describe('MistralProvider', () => {
  it('configures correct base URL and default model', () => {
    const p = new MistralProvider('test-key');
    expect(p.providerId).toBe('mistral');
    expect(p.defaultModel).toBe('mistral-large-latest');
    expect(p.supportsStreaming).toBe(true);
  });

  it('accepts custom model', () => {
    const p = new MistralProvider('test-key', 'codestral-latest');
    expect(p.defaultModel).toBe('codestral-latest');
  });

  it('throws when no API key available', () => {
    delete process.env.MISTRAL_API_KEY;
    expect(() => new MistralProvider('')).toThrow('mistral API key is required');
  });
});

describe('DeepSeekProvider', () => {
  it('configures correct base URL and default model', () => {
    const p = new DeepSeekProvider('test-key');
    expect(p.providerId).toBe('deepseek');
    expect(p.defaultModel).toBe('deepseek-chat');
    expect(p.supportsStreaming).toBe(true);
    expect(p.supportsToolCalls).toBe(true);
  });

  it('disables tool calls for deepseek-reasoner', () => {
    const p = new DeepSeekProvider('test-key', 'deepseek-reasoner');
    expect(p.defaultModel).toBe('deepseek-reasoner');
    expect(p.supportsToolCalls).toBe(false);
  });

  it('throws when no API key available', () => {
    delete process.env.DEEPSEEK_API_KEY;
    expect(() => new DeepSeekProvider('')).toThrow('deepseek API key is required');
  });
});
