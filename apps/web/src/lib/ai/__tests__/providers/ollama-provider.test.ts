/**
 * Ollama Provider Tests
 *
 * Tests for local Ollama inference: generateResponse, availability, timeout
 * All data is synthetic - NO PHI
 */

// Mock dependencies - logger uses manual mock from src/lib/__mocks__/logger.ts
jest.mock('@/lib/logger');

// Mock fetch globally
global.fetch = jest.fn();

const logger = require('@/lib/logger').default;

import { OllamaProvider, OLLAMA_MODELS } from '../../providers/ollama-provider';
import {
  mockOllamaResponse,
  mockOllamaChatResponse,
  mockOllamaModelsResponse,
} from '../../test-fixtures/mock-responses';
import {
  verifyNoPromptInLogs,
  verifyNoResponseInLogs,
  mockFetchSuccess,
} from '../../test-fixtures/test-helpers';

describe('OllamaProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
    process.env = { ...originalEnv };
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.OLLAMA_MODEL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should use default config when no config provided', () => {
      const provider = new OllamaProvider();
      expect(provider).toBeDefined();
    });

    it('should use custom baseUrl when provided', () => {
      const provider = new OllamaProvider({ baseUrl: 'http://custom:11434' });
      expect(provider).toBeDefined();
    });

    it('should use custom model when provided', () => {
      const provider = new OllamaProvider({ model: 'custom-model' });
      expect(provider).toBeDefined();
    });

    it('should use env vars for config', () => {
      process.env.OLLAMA_BASE_URL = 'http://env:11434';
      process.env.OLLAMA_MODEL = 'env-model';

      const provider = new OllamaProvider();
      expect(provider).toBeDefined();
    });
  });

  describe('generateResponse', () => {
    it('should call Ollama generate API with correct parameters', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOllamaResponse),
      });

      const provider = new OllamaProvider({ baseUrl: 'http://localhost:11434' });
      await provider.generateResponse('Test prompt');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"prompt"'),
        })
      );
    });

    it('should return response text on success', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOllamaResponse),
      });

      const provider = new OllamaProvider();
      const response = await provider.generateResponse('Test prompt');

      expect(response).toBe(mockOllamaResponse.response);
    });

    it('should prepend system prompt when provided in context', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOllamaResponse),
      });

      const provider = new OllamaProvider();
      await provider.generateResponse('User prompt', {
        systemPrompt: 'System instructions',
      });

      const call = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.prompt).toContain('System instructions');
      expect(body.prompt).toContain('User prompt');
    });

    it('should throw on API error (non-ok response)', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal server error'),
      });

      const provider = new OllamaProvider();

      await expect(provider.generateResponse('Test prompt')).rejects.toThrow(
        'Ollama API error: 500'
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'ollama_api_error',
          status: 500,
        })
      );
    });

    it('should throw on timeout', async () => {
      const timeoutError = new Error('Timeout');
      timeoutError.name = 'TimeoutError';
      (global.fetch as jest.Mock).mockRejectedValue(timeoutError);

      const provider = new OllamaProvider({ timeout: 1000 });

      await expect(provider.generateResponse('Test prompt')).rejects.toThrow(
        'Ollama request timed out'
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'ollama_timeout',
        })
      );
    });

    it('should throw on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const provider = new OllamaProvider();

      await expect(provider.generateResponse('Test prompt')).rejects.toThrow(
        'Network error'
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'ollama_error',
        })
      );
    });

    it('should log response metadata on success', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOllamaResponse),
      });

      const provider = new OllamaProvider({ model: 'phi3' });
      await provider.generateResponse('Test prompt');

      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'ollama_response',
          model: 'phi3',
        })
      );
    });

    it('should return empty string when response is empty', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ response: '' }),
      });

      const provider = new OllamaProvider();
      const response = await provider.generateResponse('Test prompt');

      expect(response).toBe('');
    });
  });

  describe('isAvailable', () => {
    it('should return true when API is reachable', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const provider = new OllamaProvider();
      const available = await provider.isAvailable();

      expect(available).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/tags'),
        expect.any(Object)
      );
    });

    it('should return false when API is unreachable', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Connection refused'));

      const provider = new OllamaProvider();
      const available = await provider.isAvailable();

      expect(available).toBe(false);
    });

    it('should return false on non-ok response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
      });

      const provider = new OllamaProvider();
      const available = await provider.isAvailable();

      expect(available).toBe(false);
    });
  });

  describe('listModels', () => {
    it('should return array of model names', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOllamaModelsResponse),
      });

      const provider = new OllamaProvider();
      const models = await provider.listModels();

      expect(models).toEqual(['phi3', 'mistral:7b', 'llama3:8b']);
    });

    it('should return empty array on error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const provider = new OllamaProvider();
      const models = await provider.listModels();

      expect(models).toEqual([]);
    });

    it('should return empty array on non-ok response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
      });

      const provider = new OllamaProvider();
      const models = await provider.listModels();

      expect(models).toEqual([]);
    });
  });

  describe('chat', () => {
    it('should call Ollama chat API with messages', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOllamaChatResponse),
      });

      const provider = new OllamaProvider();
      const messages = [
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: 'Hi there' },
        { role: 'user' as const, content: 'How are you?' },
      ];

      await provider.chat(messages);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"messages"'),
        })
      );
    });

    it('should return assistant message content', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOllamaChatResponse),
      });

      const provider = new OllamaProvider();
      const response = await provider.chat([
        { role: 'user', content: 'Hello' },
      ]);

      expect(response).toBe(mockOllamaChatResponse.message.content);
    });

    it('should throw on chat API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad request'),
      });

      const provider = new OllamaProvider();

      await expect(
        provider.chat([{ role: 'user', content: 'Hello' }])
      ).rejects.toThrow('Ollama chat API error');

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'ollama_chat_error',
        })
      );
    });
  });

  describe('OLLAMA_MODELS', () => {
    it('should export recommended model constants', () => {
      expect(OLLAMA_MODELS.phi3).toBe('phi3');
      expect(OLLAMA_MODELS.mistral).toBe('mistral:7b');
      expect(OLLAMA_MODELS.llama3).toBe('llama3:8b');
      expect(OLLAMA_MODELS.meditron).toBe('meditron:7b');
    });
  });

  describe('logging (no PHI)', () => {
    it('should not log prompt content', async () => {
      mockFetchSuccess(global.fetch as jest.Mock, mockOllamaResponse);

      const provider = new OllamaProvider();
      await provider.generateResponse('Secret patient information');

      verifyNoPromptInLogs(logger, 'Secret patient');
    });

    it('should not log response content', async () => {
      mockFetchSuccess(global.fetch as jest.Mock, mockOllamaResponse);

      const provider = new OllamaProvider();
      await provider.generateResponse('Test');

      verifyNoResponseInLogs(logger);
    });
  });
});
