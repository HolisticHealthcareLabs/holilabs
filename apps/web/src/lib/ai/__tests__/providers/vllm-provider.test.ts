/**
 * vLLM Provider Tests
 *
 * Tests for self-hosted vLLM inference: generateResponse, availability, API key
 * All data is synthetic - NO PHI
 */

// Mock dependencies - logger uses manual mock from src/lib/__mocks__/logger.ts
jest.mock('@/lib/logger');

// Mock fetch globally
global.fetch = jest.fn();

const logger = require('@/lib/logger').default;

import { VLLMProvider, VLLM_MODELS } from '../../providers/vllm-provider';
import {
  mockVLLMResponse,
  mockVLLMCompletionResponse,
  mockVLLMModelsResponse,
} from '../../test-fixtures/mock-responses';
import {
  verifyNoPromptInLogs,
  verifyNoSensitiveValueInLogs,
  mockFetchSuccess,
} from '../../test-fixtures/test-helpers';

describe('VLLMProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
    process.env = { ...originalEnv };
    delete process.env.VLLM_BASE_URL;
    delete process.env.VLLM_MODEL;
    delete process.env.VLLM_API_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should use default config when no config provided', () => {
      const provider = new VLLMProvider();
      expect(provider).toBeDefined();
    });

    it('should use custom baseUrl when provided', () => {
      const provider = new VLLMProvider({ baseUrl: 'http://custom:8000' });
      expect(provider).toBeDefined();
    });

    it('should use custom model when provided', () => {
      const provider = new VLLMProvider({ model: 'custom-model' });
      expect(provider).toBeDefined();
    });

    it('should accept optional API key', () => {
      const provider = new VLLMProvider({ apiKey: 'test-key' });
      expect(provider).toBeDefined();
    });

    it('should use env vars for config', () => {
      process.env.VLLM_BASE_URL = 'http://env:8000';
      process.env.VLLM_MODEL = 'env-model';
      process.env.VLLM_API_KEY = 'env-key';

      const provider = new VLLMProvider();
      expect(provider).toBeDefined();
    });
  });

  describe('generateResponse', () => {
    it('should call vLLM chat completions API', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockVLLMResponse),
      });

      const provider = new VLLMProvider({ baseUrl: 'http://localhost:8000' });
      await provider.generateResponse('Test prompt');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should include Bearer auth when API key is provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockVLLMResponse),
      });

      const provider = new VLLMProvider({ apiKey: 'test-api-key' });
      await provider.generateResponse('Test prompt');

      const call = (global.fetch as jest.Mock).mock.calls[0];
      expect(call[1].headers).toHaveProperty('Authorization', 'Bearer test-api-key');
    });

    it('should not include auth header when no API key', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockVLLMResponse),
      });

      const provider = new VLLMProvider({ apiKey: undefined });
      await provider.generateResponse('Test prompt');

      const call = (global.fetch as jest.Mock).mock.calls[0];
      expect(call[1].headers).not.toHaveProperty('Authorization');
    });

    it('should return message content on success', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockVLLMResponse),
      });

      const provider = new VLLMProvider();
      const response = await provider.generateResponse('Test prompt');

      expect(response).toBe(mockVLLMResponse.choices[0].message.content);
    });

    it('should include system prompt when provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockVLLMResponse),
      });

      const provider = new VLLMProvider();
      await provider.generateResponse('User prompt', {
        systemPrompt: 'System instructions',
      });

      const call = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.messages).toContainEqual({
        role: 'system',
        content: 'System instructions',
      });
    });

    it('should throw on API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal server error'),
      });

      const provider = new VLLMProvider();

      await expect(provider.generateResponse('Test prompt')).rejects.toThrow(
        'vLLM API error: 500'
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'vllm_api_error',
          status: 500,
        })
      );
    });

    it('should throw on timeout', async () => {
      const timeoutError = new Error('Timeout');
      timeoutError.name = 'TimeoutError';
      (global.fetch as jest.Mock).mockRejectedValue(timeoutError);

      const provider = new VLLMProvider({ timeout: 1000 });

      await expect(provider.generateResponse('Test prompt')).rejects.toThrow(
        'vLLM request timed out'
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'vllm_timeout',
        })
      );
    });

    it('should throw on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const provider = new VLLMProvider();

      await expect(provider.generateResponse('Test prompt')).rejects.toThrow(
        'Network error'
      );
    });

    it('should log response metadata on success', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockVLLMResponse),
      });

      const provider = new VLLMProvider({ model: 'mistral-7b' });
      await provider.generateResponse('Test prompt');

      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'vllm_response',
          model: 'mistral-7b',
        })
      );
    });
  });

  describe('isAvailable', () => {
    it('should return true when health endpoint is reachable', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const provider = new VLLMProvider();
      const available = await provider.isAvailable();

      expect(available).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.any(Object)
      );
    });

    it('should return false when health endpoint fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Connection refused'));

      const provider = new VLLMProvider();
      const available = await provider.isAvailable();

      expect(available).toBe(false);
    });

    it('should return false on non-ok response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
      });

      const provider = new VLLMProvider();
      const available = await provider.isAvailable();

      expect(available).toBe(false);
    });
  });

  describe('listModels', () => {
    it('should return array of model IDs', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockVLLMModelsResponse),
      });

      const provider = new VLLMProvider();
      const models = await provider.listModels();

      expect(models).toEqual(['mistral-7b', 'llama-3-8b']);
    });

    it('should return empty array on error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const provider = new VLLMProvider();
      const models = await provider.listModels();

      expect(models).toEqual([]);
    });
  });

  describe('chat', () => {
    it('should call vLLM chat API with messages', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockVLLMResponse),
      });

      const provider = new VLLMProvider();
      const messages = [
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: 'Hi there' },
        { role: 'user' as const, content: 'How are you?' },
      ];

      await provider.chat(messages);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/chat/completions'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should return message content', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockVLLMResponse),
      });

      const provider = new VLLMProvider();
      const response = await provider.chat([{ role: 'user', content: 'Hello' }]);

      expect(response).toBe(mockVLLMResponse.choices[0].message.content);
    });

    it('should throw on chat API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad request'),
      });

      const provider = new VLLMProvider();

      await expect(
        provider.chat([{ role: 'user', content: 'Hello' }])
      ).rejects.toThrow('vLLM chat API error');

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'vllm_chat_error',
        })
      );
    });
  });

  describe('complete', () => {
    it('should call vLLM completions API for non-chat completion', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockVLLMCompletionResponse),
      });

      const provider = new VLLMProvider();
      await provider.complete('Complete this text:');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/completions'),
        expect.any(Object)
      );
    });

    it('should return completion text', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockVLLMCompletionResponse),
      });

      const provider = new VLLMProvider();
      const response = await provider.complete('Complete this');

      expect(response).toBe(mockVLLMCompletionResponse.choices[0].text);
    });

    it('should throw on completion API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Error'),
      });

      const provider = new VLLMProvider();

      await expect(provider.complete('Test')).rejects.toThrow(
        'vLLM completion API error'
      );
    });
  });

  describe('VLLM_MODELS', () => {
    it('should export recommended model constants', () => {
      expect(VLLM_MODELS.mistral7b).toBeDefined();
      expect(VLLM_MODELS.llama3_8b).toBeDefined();
      expect(VLLM_MODELS.meditron7b).toBeDefined();
    });
  });

  describe('logging (no PHI)', () => {
    it('should not log prompt content', async () => {
      mockFetchSuccess(global.fetch as jest.Mock, mockVLLMResponse);

      const provider = new VLLMProvider();
      await provider.generateResponse('Secret patient information');

      verifyNoPromptInLogs(logger, 'Secret patient');
    });

    it('should not log API key', async () => {
      mockFetchSuccess(global.fetch as jest.Mock, mockVLLMResponse);

      const provider = new VLLMProvider({ apiKey: 'secret-api-key' });
      await provider.generateResponse('Test');

      verifyNoSensitiveValueInLogs(logger, 'secret-api-key');
    });
  });
});
