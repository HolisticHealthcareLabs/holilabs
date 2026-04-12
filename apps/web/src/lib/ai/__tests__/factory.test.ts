/**
 * Factory Tests
 *
 * Tests for AI provider factory: BYOK, provider selection, system fallback
 * All data is synthetic - NO PHI
 */

// Mock dependencies - logger uses manual mock from src/lib/__mocks__/logger.ts
jest.mock('@/lib/logger');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    userAPIKey: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/security/encryption', () => ({
  decryptPHIWithVersion: jest.fn(),
}));

jest.mock('../gemini-provider', () => ({
  GeminiProvider: jest.fn().mockImplementation(() => ({
    generateResponse: jest.fn().mockResolvedValue('Gemini response'),
  })),
}));

jest.mock('../anthropic-provider', () => ({
  AnthropicProvider: jest.fn().mockImplementation(() => ({
    generateResponse: jest.fn().mockResolvedValue('Anthropic response'),
  })),
}));

jest.mock('../providers', () => ({
  OllamaProvider: jest.fn().mockImplementation(() => ({
    generateResponse: jest.fn().mockResolvedValue('Ollama response'),
  })),
  VLLMProvider: jest.fn().mockImplementation(() => ({
    generateResponse: jest.fn().mockResolvedValue('vLLM response'),
  })),
  TogetherProvider: jest.fn().mockImplementation(() => ({
    generateResponse: jest.fn().mockResolvedValue('Together response'),
  })),
}));

const { prisma } = require('@/lib/prisma');
const { decryptPHIWithVersion } = require('@/lib/security/encryption');
const logger = require('@/lib/logger').default;
const { GeminiProvider } = require('../gemini-provider');
const { AnthropicProvider } = require('../anthropic-provider');
const { OllamaProvider, VLLMProvider, TogetherProvider } = require('../providers');

import { AIProviderFactory, BYOKError } from '../factory';
import { testUserIds, mockUserAPIKey } from '../test-fixtures/test-data';

describe('AIProviderFactory', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset env vars
    process.env = { ...originalEnv };
    delete process.env.TOGETHER_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_AI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.OLLAMA_MODEL;
    delete process.env.VLLM_BASE_URL;
    delete process.env.VLLM_MODEL;
    delete process.env.VLLM_API_KEY;

    (prisma.userAPIKey.findMany as jest.Mock).mockResolvedValue([]);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getProvider', () => {
    describe('local provider detection', () => {
      it('should return OllamaProvider when preferred and available', async () => {
        process.env.OLLAMA_BASE_URL = 'http://localhost:11434';

        const provider = await AIProviderFactory.getProvider(
          testUserIds.standard,
          'ollama'
        );

        expect(OllamaProvider).toHaveBeenCalled();
        expect(provider).toBeDefined();
      });

      it('should return VLLMProvider when preferred and available', async () => {
        process.env.VLLM_BASE_URL = 'http://localhost:8000';

        const provider = await AIProviderFactory.getProvider(
          testUserIds.standard,
          'vllm'
        );

        expect(VLLMProvider).toHaveBeenCalled();
        expect(provider).toBeDefined();
      });

      it('should pass Ollama config from env vars', async () => {
        process.env.OLLAMA_BASE_URL = 'http://custom:11434';
        process.env.OLLAMA_MODEL = 'custom-model';

        await AIProviderFactory.getProvider(testUserIds.standard, 'ollama');

        expect(OllamaProvider).toHaveBeenCalledWith(
          expect.objectContaining({
            baseUrl: 'http://custom:11434',
            model: 'custom-model',
          })
        );
      });

      it('should pass vLLM config from env vars', async () => {
        process.env.VLLM_BASE_URL = 'http://custom:8000';
        process.env.VLLM_MODEL = 'custom-model';
        process.env.VLLM_API_KEY = 'test-vllm-key';

        await AIProviderFactory.getProvider(testUserIds.standard, 'vllm');

        expect(VLLMProvider).toHaveBeenCalledWith(
          expect.objectContaining({
            baseUrl: 'http://custom:8000',
            model: 'custom-model',
            apiKey: 'test-vllm-key',
          })
        );
      });
    });

    describe('BYOK flow', () => {
      it('should use BYOK key when user has matching provider key', async () => {
        (prisma.userAPIKey.findMany as jest.Mock).mockResolvedValue([
          mockUserAPIKey,
        ]);
        (decryptPHIWithVersion as jest.Mock).mockResolvedValue('decrypted-key');
        process.env.GEMINI_API_KEY = 'fallback-key'; // Ensure fallback exists

        const provider = await AIProviderFactory.getProvider(
          testUserIds.withBYOK,
          'anthropic'
        );

        expect(decryptPHIWithVersion).toHaveBeenCalledWith(
          mockUserAPIKey.encryptedKey
        );
        expect(AnthropicProvider).toHaveBeenCalledWith('decrypted-key');
        expect(provider).toBeDefined();
      });

      it('should lookup user keys from database', async () => {
        process.env.GEMINI_API_KEY = 'system-key';

        await AIProviderFactory.getProvider(testUserIds.standard);

        expect(prisma.userAPIKey.findMany).toHaveBeenCalledWith({
          where: { userId: testUserIds.standard },
        });
      });

      it('should fall through on decryption failure', async () => {
        (prisma.userAPIKey.findMany as jest.Mock).mockResolvedValue([
          mockUserAPIKey,
        ]);
        (decryptPHIWithVersion as jest.Mock).mockRejectedValue(
          new Error('Decryption failed')
        );
        process.env.GEMINI_API_KEY = 'fallback-key';

        await AIProviderFactory.getProvider(
          testUserIds.withBYOK,
          'anthropic'
        );

        expect(logger.error).toHaveBeenCalledWith(
          expect.objectContaining({
            event: 'ai_provider_key_decrypt_failed',
          })
        );
        // Should fall through to system provider
        expect(GeminiProvider).toHaveBeenCalled();
      });

      it('should handle null decryption result', async () => {
        (prisma.userAPIKey.findMany as jest.Mock).mockResolvedValue([
          mockUserAPIKey,
        ]);
        (decryptPHIWithVersion as jest.Mock).mockResolvedValue(null);
        process.env.GEMINI_API_KEY = 'fallback-key';

        await AIProviderFactory.getProvider(
          testUserIds.withBYOK,
          'anthropic'
        );

        // Should fall through to system provider
        expect(GeminiProvider).toHaveBeenCalled();
      });
    });

    describe('system fallback order', () => {
      it('should prefer Together when TOGETHER_API_KEY is set', async () => {
        process.env.TOGETHER_API_KEY = 'together-key';
        process.env.GEMINI_API_KEY = 'gemini-key';
        process.env.ANTHROPIC_API_KEY = 'anthropic-key';

        await AIProviderFactory.getProvider(testUserIds.standard);

        expect(TogetherProvider).toHaveBeenCalledWith({ apiKey: 'together-key' });
      });

      it('should use Gemini when only GEMINI_API_KEY is set', async () => {
        process.env.GEMINI_API_KEY = 'gemini-key';

        await AIProviderFactory.getProvider(testUserIds.standard);

        expect(GeminiProvider).toHaveBeenCalledWith('gemini-key');
      });

      it('should use Gemini when only GOOGLE_AI_API_KEY is set', async () => {
        process.env.GOOGLE_AI_API_KEY = 'google-key';

        await AIProviderFactory.getProvider(testUserIds.standard);

        expect(GeminiProvider).toHaveBeenCalledWith('google-key');
      });

      it('should use Anthropic when only ANTHROPIC_API_KEY is set', async () => {
        process.env.ANTHROPIC_API_KEY = 'anthropic-key';

        await AIProviderFactory.getProvider(testUserIds.standard);

        expect(AnthropicProvider).toHaveBeenCalledWith('anthropic-key');
      });

      it('should throw when no provider is available', async () => {
        // No env vars set

        await expect(
          AIProviderFactory.getProvider(testUserIds.noCreds)
        ).rejects.toThrow('No AI provider available');
      });
    });

    describe('provider aliases', () => {
      it('should treat "google" as gemini alias', async () => {
        (prisma.userAPIKey.findMany as jest.Mock).mockResolvedValue([
          { ...mockUserAPIKey, provider: 'google' },
        ]);
        (decryptPHIWithVersion as jest.Mock).mockResolvedValue('decrypted-key');

        await AIProviderFactory.getProvider(testUserIds.withBYOK, 'google');

        expect(GeminiProvider).toHaveBeenCalledWith('decrypted-key');
      });

      it('should treat "claude" as anthropic alias', async () => {
        (prisma.userAPIKey.findMany as jest.Mock).mockResolvedValue([
          { ...mockUserAPIKey, provider: 'claude' },
        ]);
        (decryptPHIWithVersion as jest.Mock).mockResolvedValue('decrypted-key');

        await AIProviderFactory.getProvider(testUserIds.withBYOK, 'claude');

        expect(AnthropicProvider).toHaveBeenCalledWith('decrypted-key');
      });
    });
  });

  describe('getProviderForTask', () => {
    describe('local task', () => {
      it('should prefer Ollama for local task when available', async () => {
        process.env.OLLAMA_BASE_URL = 'http://localhost:11434';
        process.env.GEMINI_API_KEY = 'fallback-key';

        await AIProviderFactory.getProviderForTask(testUserIds.standard, 'local');

        expect(OllamaProvider).toHaveBeenCalled();
      });

      it('should prefer vLLM for local task when Ollama not configured', async () => {
        process.env.VLLM_BASE_URL = 'http://localhost:8000';
        process.env.GEMINI_API_KEY = 'fallback-key';

        await AIProviderFactory.getProviderForTask(testUserIds.standard, 'local');

        expect(VLLMProvider).toHaveBeenCalled();
        expect(OllamaProvider).not.toHaveBeenCalled();
      });

      it('should fall back to gemini for local task when no local providers configured', async () => {
        process.env.GEMINI_API_KEY = 'gemini-key';

        await AIProviderFactory.getProviderForTask(testUserIds.standard, 'local');

        expect(GeminiProvider).toHaveBeenCalled();
        expect(OllamaProvider).not.toHaveBeenCalled();
        expect(VLLMProvider).not.toHaveBeenCalled();
      });
    });

    describe('medical task', () => {
      it('should prefer Together with Meditron for medical task', async () => {
        process.env.TOGETHER_API_KEY = 'together-key';
        process.env.ANTHROPIC_API_KEY = 'fallback-key';

        await AIProviderFactory.getProviderForTask(testUserIds.standard, 'medical');

        expect(TogetherProvider).toHaveBeenCalledWith(
          expect.objectContaining({
            model: 'epfl-llm/meditron-7b',
          })
        );
      });

      it('should fall back to Claude for medical task when Together unavailable', async () => {
        process.env.ANTHROPIC_API_KEY = 'anthropic-key';

        await AIProviderFactory.getProviderForTask(testUserIds.standard, 'medical');

        expect(AnthropicProvider).toHaveBeenCalled();
      });
    });

    describe('safety-critical task', () => {
      it('should always use Anthropic for safety-critical task', async () => {
        process.env.ANTHROPIC_API_KEY = 'anthropic-key';
        process.env.GEMINI_API_KEY = 'gemini-key';

        await AIProviderFactory.getProviderForTask(
          testUserIds.standard,
          'safety-critical'
        );

        expect(AnthropicProvider).toHaveBeenCalled();
        expect(GeminiProvider).not.toHaveBeenCalled();
      });

      it('should fall back to best available when no Anthropic key', async () => {
        process.env.GEMINI_API_KEY = 'gemini-key';

        await AIProviderFactory.getProviderForTask(
          testUserIds.standard,
          'safety-critical'
        );

        // Falls back to getProvider() which uses system fallback
        expect(GeminiProvider).toHaveBeenCalled();
      });
    });

    describe('general task', () => {
      it('should use standard getProvider for general task', async () => {
        process.env.TOGETHER_API_KEY = 'together-key';

        await AIProviderFactory.getProviderForTask(testUserIds.standard, 'general');

        expect(TogetherProvider).toHaveBeenCalled();
      });
    });
  });

  describe('logging (no PHI)', () => {
    it('should not log API keys', async () => {
      (prisma.userAPIKey.findMany as jest.Mock).mockResolvedValue([
        mockUserAPIKey,
      ]);
      (decryptPHIWithVersion as jest.Mock).mockRejectedValue(
        new Error('Decryption failed')
      );
      process.env.GEMINI_API_KEY = 'secret-key';

      await AIProviderFactory.getProvider(testUserIds.withBYOK, 'anthropic');

      const allCalls = [...logger.error.mock.calls, ...logger.info.mock.calls];
      allCalls.forEach((call: any[]) => {
        const logObj = call[0];
        expect(JSON.stringify(logObj)).not.toContain('secret-key');
        expect(JSON.stringify(logObj)).not.toContain('decrypted');
      });
    });
  });

  // P2-007: BYOK fail-fast tests
  describe('strictBYOK option', () => {
    it('should throw BYOKError when strictBYOK=true and decryption fails', async () => {
      (prisma.userAPIKey.findMany as jest.Mock).mockResolvedValue([
        mockUserAPIKey,
      ]);
      (decryptPHIWithVersion as jest.Mock).mockRejectedValue(
        new Error('Decryption failed')
      );
      process.env.GEMINI_API_KEY = 'fallback-key';

      await expect(
        AIProviderFactory.getProvider(testUserIds.withBYOK, 'anthropic', {
          strictBYOK: true,
        })
      ).rejects.toThrow(BYOKError);

      // Gemini should NOT have been called (no fallback)
      expect(GeminiProvider).not.toHaveBeenCalled();
    });

    it('should throw BYOKError when strictBYOK=true and decryption returns null', async () => {
      (prisma.userAPIKey.findMany as jest.Mock).mockResolvedValue([
        mockUserAPIKey,
      ]);
      (decryptPHIWithVersion as jest.Mock).mockResolvedValue(null);
      process.env.GEMINI_API_KEY = 'fallback-key';

      await expect(
        AIProviderFactory.getProvider(testUserIds.withBYOK, 'anthropic', {
          strictBYOK: true,
        })
      ).rejects.toThrow(BYOKError);
    });

    it('should throw BYOKError when strictBYOK=true and no key found', async () => {
      (prisma.userAPIKey.findMany as jest.Mock).mockResolvedValue([]);
      process.env.GEMINI_API_KEY = 'fallback-key';

      await expect(
        AIProviderFactory.getProvider(testUserIds.standard, 'anthropic', {
          strictBYOK: true,
        })
      ).rejects.toThrow(BYOKError);
    });

    it('should include provider and reason in BYOKError', async () => {
      (prisma.userAPIKey.findMany as jest.Mock).mockResolvedValue([
        mockUserAPIKey,
      ]);
      (decryptPHIWithVersion as jest.Mock).mockRejectedValue(
        new Error('Decryption failed')
      );
      process.env.GEMINI_API_KEY = 'fallback-key';

      try {
        await AIProviderFactory.getProvider(testUserIds.withBYOK, 'anthropic', {
          strictBYOK: true,
        });
        fail('Expected BYOKError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BYOKError);
        expect((error as BYOKError).provider).toBe('anthropic');
        expect((error as BYOKError).reason).toBe('decryption_failed');
      }
    });

    it('should fall back silently when strictBYOK=false (default)', async () => {
      (prisma.userAPIKey.findMany as jest.Mock).mockResolvedValue([
        mockUserAPIKey,
      ]);
      (decryptPHIWithVersion as jest.Mock).mockRejectedValue(
        new Error('Decryption failed')
      );
      process.env.GEMINI_API_KEY = 'fallback-key';

      // Should not throw with default strictBYOK=false
      const provider = await AIProviderFactory.getProvider(
        testUserIds.withBYOK,
        'anthropic'
      );

      expect(provider).toBeDefined();
      // Should have fallen back to Gemini
      expect(GeminiProvider).toHaveBeenCalled();
    });

    it('should succeed when BYOK key is valid even with strictBYOK=true', async () => {
      (prisma.userAPIKey.findMany as jest.Mock).mockResolvedValue([
        mockUserAPIKey,
      ]);
      (decryptPHIWithVersion as jest.Mock).mockResolvedValue('valid-key');

      const provider = await AIProviderFactory.getProvider(
        testUserIds.withBYOK,
        'anthropic',
        { strictBYOK: true }
      );

      expect(provider).toBeDefined();
      expect(AnthropicProvider).toHaveBeenCalledWith('valid-key');
    });
  });

  // P2-005: getProviderForUnifiedTask tests
  describe('getProviderForUnifiedTask', () => {
    it('should use local provider for transcript-summary', async () => {
      process.env.OLLAMA_BASE_URL = 'http://localhost:11434';
      process.env.GEMINI_API_KEY = 'fallback-key';

      await AIProviderFactory.getProviderForUnifiedTask(
        testUserIds.standard,
        'transcript-summary'
      );

      expect(OllamaProvider).toHaveBeenCalled();
    });

    it('should fall back to primary provider when local unavailable', async () => {
      // No Ollama env vars set
      process.env.GEMINI_API_KEY = 'fallback-key';

      await AIProviderFactory.getProviderForUnifiedTask(
        testUserIds.standard,
        'transcript-summary'
      );

      // Should have tried Ollama fallback chain
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'ai_factory_local_provider_unavailable',
        })
      );
    });

    it('should route drug-interaction to Claude', async () => {
      process.env.ANTHROPIC_API_KEY = 'anthropic-key';

      await AIProviderFactory.getProviderForUnifiedTask(
        testUserIds.standard,
        'drug-interaction'
      );

      expect(AnthropicProvider).toHaveBeenCalled();
    });

    it('should route translation to Gemini', async () => {
      process.env.GEMINI_API_KEY = 'gemini-key';

      await AIProviderFactory.getProviderForUnifiedTask(
        testUserIds.standard,
        'translation'
      );

      expect(GeminiProvider).toHaveBeenCalled();
    });

    it('should log task routing decision', async () => {
      process.env.GEMINI_API_KEY = 'gemini-key';

      await AIProviderFactory.getProviderForUnifiedTask(
        testUserIds.standard,
        'billing-codes'
      );

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'ai_factory_task_routing',
          task: 'billing-codes',
          primaryProvider: 'gemini',
        })
      );
    });
  });
});
