/**
 * Together.ai Provider Tests
 *
 * Tests for Together.ai cloud inference: generateResponse, embeddings, availability
 * All data is synthetic - NO PHI
 */

// Mock dependencies - logger uses manual mock from src/lib/__mocks__/logger.ts
jest.mock('@/lib/logger');

// Mock fetch globally
global.fetch = jest.fn();

const logger = require('@/lib/logger').default;

import {
  TogetherProvider,
  TOGETHER_MODELS,
  TOGETHER_PRICING,
} from '../../providers/together-provider';
import {
  mockTogetherResponse,
  mockTogetherModelsResponse,
  mockTogetherEmbeddingsResponse,
} from '../../test-fixtures/mock-responses';
import {
  verifyNoPromptInLogs,
  verifyNoSensitiveValueInLogs,
  verifyNoResponseInLogs,
  mockFetchSuccess,
} from '../../test-fixtures/test-helpers';

describe('TogetherProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
    process.env = { ...originalEnv };
    delete process.env.TOGETHER_API_KEY;
    delete process.env.TOGETHER_MODEL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should throw when no API key is provided', () => {
      expect(() => new TogetherProvider()).toThrow(/API key is required|TOGETHER_API_KEY/);
    });

    it('should accept API key from config', () => {
      const provider = new TogetherProvider({ apiKey: 'test-key' });
      expect(provider).toBeDefined();
    });

    it('should accept API key from env var', async () => {
      // Reset modules so env var is read fresh
      jest.resetModules();
      process.env.TOGETHER_API_KEY = 'env-key';

      // Re-import after setting env var
      const { TogetherProvider: FreshProvider } = await import('../../providers/together-provider');
      const provider = new FreshProvider();
      expect(provider).toBeDefined();
    });

    it('should use custom model when provided', () => {
      const provider = new TogetherProvider({
        apiKey: 'test-key',
        model: 'custom-model',
      });
      expect(provider).toBeDefined();
    });

    it('should use env var for model', async () => {
      // Reset modules so env vars are read fresh
      jest.resetModules();
      process.env.TOGETHER_API_KEY = 'test-key';
      process.env.TOGETHER_MODEL = 'env-model';

      // Re-import after setting env vars
      const { TogetherProvider: FreshProvider } = await import('../../providers/together-provider');
      const provider = new FreshProvider();
      expect(provider).toBeDefined();
    });
  });

  describe('generateResponse', () => {
    it('should call Together.ai chat completions API', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTogetherResponse),
      });

      const provider = new TogetherProvider({ apiKey: 'test-key' });
      await provider.generateResponse('Test prompt');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.together.xyz/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-key',
          }),
        })
      );
    });

    it('should return message content on success', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTogetherResponse),
      });

      const provider = new TogetherProvider({ apiKey: 'test-key' });
      const response = await provider.generateResponse('Test prompt');

      expect(response).toBe(mockTogetherResponse.choices[0].message.content);
    });

    it('should include system prompt when provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTogetherResponse),
      });

      const provider = new TogetherProvider({ apiKey: 'test-key' });
      await provider.generateResponse('User prompt', {
        systemPrompt: 'System instructions',
      });

      const call = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.messages[0]).toEqual({
        role: 'system',
        content: 'System instructions',
      });
    });

    it('should send all configured parameters', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTogetherResponse),
      });

      const provider = new TogetherProvider({
        apiKey: 'test-key',
        model: 'custom-model',
        temperature: 0.5,
        maxTokens: 2000,
        topP: 0.9,
        topK: 40,
        repetitionPenalty: 1.2,
      });

      await provider.generateResponse('Test');

      const call = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);

      expect(body.model).toBe('custom-model');
      expect(body.temperature).toBe(0.5);
      expect(body.max_tokens).toBe(2000);
      expect(body.top_p).toBe(0.9);
      expect(body.top_k).toBe(40);
      expect(body.repetition_penalty).toBe(1.2);
    });

    it('should throw on API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      const provider = new TogetherProvider({ apiKey: 'test-key' });

      await expect(provider.generateResponse('Test prompt')).rejects.toThrow(
        'Together.ai API error: 401'
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'together_api_error',
          status: 401,
        })
      );
    });

    it('should throw on timeout', async () => {
      const timeoutError = new Error('Timeout');
      timeoutError.name = 'TimeoutError';
      (global.fetch as jest.Mock).mockRejectedValue(timeoutError);

      const provider = new TogetherProvider({ apiKey: 'test-key', timeout: 1000 });

      await expect(provider.generateResponse('Test prompt')).rejects.toThrow(
        'Together.ai request timed out'
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'together_timeout',
        })
      );
    });

    it('should throw on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const provider = new TogetherProvider({ apiKey: 'test-key' });

      await expect(provider.generateResponse('Test prompt')).rejects.toThrow(
        'Network error'
      );
    });

    it('should log response metadata on success', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTogetherResponse),
      });

      const provider = new TogetherProvider({
        apiKey: 'test-key',
        model: 'test-model',
      });
      await provider.generateResponse('Test prompt');

      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'together_response',
          model: 'test-model',
        })
      );
    });
  });

  describe('isAvailable', () => {
    it('should return true when models endpoint is reachable', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTogetherModelsResponse),
      });

      const provider = new TogetherProvider({ apiKey: 'test-key' });
      const available = await provider.isAvailable();

      expect(available).toBe(true);
    });

    it('should return false when models endpoint fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Connection refused'));

      const provider = new TogetherProvider({ apiKey: 'test-key' });
      const available = await provider.isAvailable();

      expect(available).toBe(false);
    });

    it('should return false when no models returned', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      const provider = new TogetherProvider({ apiKey: 'test-key' });
      const available = await provider.isAvailable();

      expect(available).toBe(false);
    });
  });

  describe('listModels', () => {
    it('should return array of model IDs', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTogetherModelsResponse),
      });

      const provider = new TogetherProvider({ apiKey: 'test-key' });
      const models = await provider.listModels();

      expect(models).toEqual([
        'mistralai/Mistral-7B-Instruct-v0.3',
        'meta-llama/Meta-Llama-3-8B-Instruct',
        'epfl-llm/meditron-7b',
      ]);
    });

    it('should return empty array on error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const provider = new TogetherProvider({ apiKey: 'test-key' });
      const models = await provider.listModels();

      expect(models).toEqual([]);
    });

    it('should return empty array on non-ok response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
      });

      const provider = new TogetherProvider({ apiKey: 'test-key' });
      const models = await provider.listModels();

      expect(models).toEqual([]);
    });
  });

  describe('chat', () => {
    it('should call Together.ai chat API with messages', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTogetherResponse),
      });

      const provider = new TogetherProvider({ apiKey: 'test-key' });
      const messages = [
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: 'Hi there' },
        { role: 'user' as const, content: 'How are you?' },
      ];

      await provider.chat(messages);

      const call = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.messages).toEqual(messages);
    });

    it('should return message content', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTogetherResponse),
      });

      const provider = new TogetherProvider({ apiKey: 'test-key' });
      const response = await provider.chat([{ role: 'user', content: 'Hello' }]);

      expect(response).toBe(mockTogetherResponse.choices[0].message.content);
    });

    it('should throw on chat API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad request'),
      });

      const provider = new TogetherProvider({ apiKey: 'test-key' });

      await expect(
        provider.chat([{ role: 'user', content: 'Hello' }])
      ).rejects.toThrow('Together.ai chat API error');

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'together_chat_error',
        })
      );
    });
  });

  describe('embed', () => {
    it('should call Together.ai embeddings API', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTogetherEmbeddingsResponse),
      });

      const provider = new TogetherProvider({ apiKey: 'test-key' });
      await provider.embed('Test text');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.together.xyz/v1/embeddings',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should return embeddings array for single text', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTogetherEmbeddingsResponse),
      });

      const provider = new TogetherProvider({ apiKey: 'test-key' });
      const embeddings = await provider.embed('Test text');

      expect(embeddings).toHaveLength(1);
      expect(embeddings[0]).toHaveLength(768);
    });

    it('should accept array of texts', async () => {
      const batchResponse = {
        ...mockTogetherEmbeddingsResponse,
        data: [
          { embedding: Array(768).fill(0.1), index: 0 },
          { embedding: Array(768).fill(0.2), index: 1 },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(batchResponse),
      });

      const provider = new TogetherProvider({ apiKey: 'test-key' });
      const embeddings = await provider.embed(['Text 1', 'Text 2']);

      expect(embeddings).toHaveLength(2);
    });

    it('should throw on embeddings API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Error'),
      });

      const provider = new TogetherProvider({ apiKey: 'test-key' });

      await expect(provider.embed('Test')).rejects.toThrow(
        'Together.ai embeddings API error'
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'together_embed_error',
        })
      );
    });
  });

  describe('TOGETHER_MODELS', () => {
    it('should export recommended model constants', () => {
      expect(TOGETHER_MODELS.mistral7b).toBe('mistralai/Mistral-7B-Instruct-v0.3');
      expect(TOGETHER_MODELS.llama3_8b).toBe('meta-llama/Meta-Llama-3-8B-Instruct');
      expect(TOGETHER_MODELS.meditron7b).toBe('epfl-llm/meditron-7b');
      expect(TOGETHER_MODELS.meditron70b).toBe('epfl-llm/meditron-70b');
    });
  });

  describe('TOGETHER_PRICING', () => {
    it('should export pricing information', () => {
      expect(TOGETHER_PRICING['mistralai/Mistral-7B-Instruct-v0.3']).toEqual({
        input: 0.2,
        output: 0.2,
      });
      expect(TOGETHER_PRICING['epfl-llm/meditron-7b']).toEqual({
        input: 0.2,
        output: 0.2,
      });
    });
  });

  describe('logging (no PHI)', () => {
    it('should not log prompt content', async () => {
      mockFetchSuccess(global.fetch as jest.Mock, mockTogetherResponse);

      const provider = new TogetherProvider({ apiKey: 'test-key' });
      await provider.generateResponse('Secret patient information');

      verifyNoPromptInLogs(logger, 'Secret patient');
    });

    it('should not log API key', async () => {
      mockFetchSuccess(global.fetch as jest.Mock, mockTogetherResponse);

      const provider = new TogetherProvider({ apiKey: 'secret-api-key' });
      await provider.generateResponse('Test');

      verifyNoSensitiveValueInLogs(logger, 'secret-api-key');
    });

    it('should not log response content', async () => {
      mockFetchSuccess(global.fetch as jest.Mock, mockTogetherResponse);

      const provider = new TogetherProvider({ apiKey: 'test-key' });
      await provider.generateResponse('Test');

      verifyNoResponseInLogs(logger);
    });
  });
});
