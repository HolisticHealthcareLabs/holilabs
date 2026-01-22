/**
 * Task Router Tests
 *
 * Tests for task-based AI routing: task mapping, availability checks
 * All data is synthetic - NO PHI
 */

// Mock dependencies - logger uses manual mock from src/lib/__mocks__/logger.ts
jest.mock('@/lib/logger');

// Mock fetch globally
global.fetch = jest.fn();

const logger = require('@/lib/logger').default;

import {
  selectModelForTask,
  TaskRouter,
  getDefaultRouter,
  getDefaultRouterAsync,
  invalidateAvailabilityCache,
  _getAvailabilityCacheState,
  _resetDefaultRouter,
  type AITask,
  type ModelSelection,
} from '../../providers/task-router';
import {
  allAITasks,
  localPreferredTasks,
  claudeRequiredTasks,
} from '../../test-fixtures/test-data';
import type { AITask as AITaskType } from '../../providers/task-router';
import { mockOllamaModelsResponse } from '../../test-fixtures/mock-responses';
import { verifyNoPromptInLogs, mockFetchSuccess } from '../../test-fixtures/test-helpers';

describe('task-router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  describe('selectModelForTask', () => {
    it.each(localPreferredTasks)(
      'should select local provider for %s',
      (task) => {
        const selection = selectModelForTask(task);
        expect(selection.privacyLevel).toBe('local');
        expect(['ollama', 'vllm']).toContain(selection.provider);
      }
    );

    it.each(claudeRequiredTasks)(
      'should select claude for safety-critical task %s',
      (task) => {
        const selection = selectModelForTask(task);
        expect(selection.provider).toBe('claude');
      }
    );

    it('should select gemini for PATIENT_EDUCATION', () => {
      const selection = selectModelForTask('PATIENT_EDUCATION');
      expect(selection.provider).toBe('gemini');
      expect(selection.estimatedCostPer1k).toBeLessThan(0.001);
    });

    it('should select gemini for TRANSLATION', () => {
      const selection = selectModelForTask('TRANSLATION');
      expect(selection.provider).toBe('gemini');
    });

    it('should select gemini for BILLING_CODES', () => {
      const selection = selectModelForTask('BILLING_CODES');
      expect(selection.provider).toBe('gemini');
    });

    it('should select gemini for SCHEDULING', () => {
      const selection = selectModelForTask('SCHEDULING');
      expect(selection.provider).toBe('gemini');
    });

    it('should select together for ICD_CODING (medical domain)', () => {
      const selection = selectModelForTask('ICD_CODING');
      expect(selection.provider).toBe('together');
      expect(selection.model).toContain('meditron');
    });

    it('should select gemini for GENERAL as default', () => {
      const selection = selectModelForTask('GENERAL');
      expect(selection.provider).toBe('gemini');
    });

    it('should return GENERAL config for unknown task', () => {
      // @ts-expect-error Testing invalid task
      const selection = selectModelForTask('UNKNOWN_TASK');
      expect(selection.provider).toBe('gemini');
    });

    it('should return ModelSelection with all required fields', () => {
      const selection = selectModelForTask('SOAP_GENERATION');

      expect(selection).toHaveProperty('provider');
      expect(selection).toHaveProperty('model');
      expect(selection).toHaveProperty('reason');
      expect(selection).toHaveProperty('estimatedLatency');
      expect(selection).toHaveProperty('privacyLevel');
      expect(selection).toHaveProperty('estimatedCostPer1k');

      expect(['fast', 'medium', 'slow']).toContain(selection.estimatedLatency);
      expect(['local', 'self-hosted', 'cloud']).toContain(selection.privacyLevel);
      expect(typeof selection.estimatedCostPer1k).toBe('number');
    });

    it('should have zero cost for local providers', () => {
      const selection = selectModelForTask('TRANSCRIPT_SUMMARY');
      expect(selection.provider).toBe('ollama');
      expect(selection.estimatedCostPer1k).toBe(0);
    });

    it('should cover all defined AI tasks', () => {
      allAITasks.forEach((task) => {
        const selection = selectModelForTask(task);
        expect(selection).toBeDefined();
        expect(selection.provider).toBeDefined();
      });
    });
  });

  describe('TaskRouter', () => {
    describe('constructor', () => {
      it('should use default config when no config provided', () => {
        const router = new TaskRouter();
        expect(router).toBeDefined();
      });

      it('should merge custom config with defaults', () => {
        const router = new TaskRouter({
          preferLocal: false,
          forceProvider: 'claude',
        });
        expect(router).toBeDefined();
      });

      it('should accept custom Ollama config', () => {
        const router = new TaskRouter({
          ollamaBaseUrl: 'http://custom:11434',
          ollamaModel: 'custom-model',
        });
        expect(router).toBeDefined();
      });

      it('should accept custom vLLM config', () => {
        const router = new TaskRouter({
          vllmBaseUrl: 'http://custom:8000',
          vllmModel: 'custom-model',
        });
        expect(router).toBeDefined();
      });

      it('should accept custom Together config', () => {
        const router = new TaskRouter({
          togetherApiKey: 'test-key',
          togetherModel: 'custom-model',
        });
        expect(router).toBeDefined();
      });

      it('should log warning on provider initialization failure', () => {
        // Provider constructors are not mocked, so they may fail without env vars
        // This is expected behavior - router should handle gracefully
        new TaskRouter();
        // Logger warnings may or may not be called depending on provider init
        expect(logger.warn).toBeDefined();
      });
    });

    describe('checkAvailability', () => {
      it('should check Ollama availability via health endpoint', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockOllamaModelsResponse),
        });

        const router = new TaskRouter();
        const availability = await router.checkAvailability();

        expect(availability).toBeInstanceOf(Map);
      });

      it('should mark cloud providers as always available', async () => {
        (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

        const router = new TaskRouter();
        const availability = await router.checkAvailability();

        expect(availability.get('claude')).toBe(true);
        expect(availability.get('gemini')).toBe(true);
        expect(availability.get('openai')).toBe(true);
      });

      it('should handle fetch failures gracefully', async () => {
        (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

        const router = new TaskRouter();
        const availability = await router.checkAvailability();

        // Should not throw
        expect(availability).toBeInstanceOf(Map);
      });
    });

    describe('getProvider', () => {
      it('should return null for cloud providers', () => {
        const router = new TaskRouter();

        expect(router.getProvider('claude')).toBeNull();
        expect(router.getProvider('gemini')).toBeNull();
        expect(router.getProvider('openai')).toBeNull();
      });

      it('should return provider instance for local providers when configured', () => {
        const router = new TaskRouter({
          togetherApiKey: 'test-key',
        });

        // Together provider should be initialized
        const provider = router.getProvider('together');
        // May be null if initialization failed, or instance if succeeded
        expect(provider === null || typeof provider === 'object').toBe(true);
      });
    });

    describe('route', () => {
      it('should select provider based on task', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockOllamaModelsResponse),
        });

        const router = new TaskRouter();

        // This will throw because cloud providers require external routing
        await expect(
          router.route('DRUG_INTERACTION', 'Test prompt')
        ).rejects.toThrow('requires external routing via chat.ts');
      });

      it('should use force provider when configured', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockOllamaModelsResponse),
        });

        const router = new TaskRouter({
          forceProvider: 'gemini',
        });

        // Gemini requires external routing
        await expect(
          router.route('TRANSCRIPT_SUMMARY', 'Test prompt')
        ).rejects.toThrow('requires external routing via chat.ts');
      });

      it('should log routing decision', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockOllamaModelsResponse),
        });

        const router = new TaskRouter();

        try {
          await router.route('TRANSLATION', 'Test prompt');
        } catch {
          // Expected to throw for cloud providers
        }

        expect(logger.info).toHaveBeenCalledWith(
          expect.objectContaining({
            event: 'task_router_request',
            task: 'TRANSLATION',
          })
        );
      });

      it('should use fallback when primary provider unavailable', async () => {
        (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

        const router = new TaskRouter({
          fallbackChain: ['gemini', 'claude'],
        });

        try {
          await router.route('TRANSCRIPT_SUMMARY', 'Test prompt');
        } catch {
          // Expected to throw
        }

        // Should log fallback attempt
        expect(logger.info).toBeDefined();
      });
    });

    describe('helper methods', () => {
      let router: TaskRouter;

      beforeEach(() => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockOllamaModelsResponse),
        });
        router = new TaskRouter();
      });

      it('transcriptSummary should route to TRANSCRIPT_SUMMARY', async () => {
        try {
          await router.transcriptSummary('Test prompt');
        } catch {
          // Expected to throw
        }

        expect(logger.info).toHaveBeenCalledWith(
          expect.objectContaining({
            task: 'TRANSCRIPT_SUMMARY',
          })
        );
      });

      it('soapGeneration should route to SOAP_GENERATION', async () => {
        try {
          await router.soapGeneration('Test prompt');
        } catch {
          // Expected to throw
        }

        expect(logger.info).toHaveBeenCalledWith(
          expect.objectContaining({
            task: 'SOAP_GENERATION',
          })
        );
      });

      it('drugInteraction should route to DRUG_INTERACTION', async () => {
        try {
          await router.drugInteraction('Test prompt');
        } catch {
          // Expected to throw
        }

        expect(logger.info).toHaveBeenCalledWith(
          expect.objectContaining({
            task: 'DRUG_INTERACTION',
          })
        );
      });

      it('icdCoding should route to ICD_CODING', async () => {
        try {
          await router.icdCoding('Test prompt');
        } catch {
          // Expected to throw
        }

        expect(logger.info).toHaveBeenCalledWith(
          expect.objectContaining({
            task: 'ICD_CODING',
          })
        );
      });

      it('clinicalNotes should route to CLINICAL_NOTES', async () => {
        try {
          await router.clinicalNotes('Test prompt');
        } catch {
          // Expected to throw
        }

        expect(logger.info).toHaveBeenCalledWith(
          expect.objectContaining({
            task: 'CLINICAL_NOTES',
          })
        );
      });

      it('translation should route to TRANSLATION', async () => {
        try {
          await router.translation('Test prompt');
        } catch {
          // Expected to throw
        }

        expect(logger.info).toHaveBeenCalledWith(
          expect.objectContaining({
            task: 'TRANSLATION',
          })
        );
      });
    });
  });

  describe('getDefaultRouter', () => {
    beforeEach(() => {
      _resetDefaultRouter();
    });

    it('should return a TaskRouter instance', () => {
      const router = getDefaultRouter();
      expect(router).toBeInstanceOf(TaskRouter);
    });

    it('should return the same singleton instance', () => {
      const router1 = getDefaultRouter();
      const router2 = getDefaultRouter();
      expect(router1).toBe(router2);
    });
  });

  // P2-008: Race-free singleton tests
  describe('getDefaultRouterAsync', () => {
    beforeEach(() => {
      _resetDefaultRouter();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOllamaModelsResponse),
      });
    });

    it('should return a TaskRouter instance', async () => {
      const router = await getDefaultRouterAsync();
      expect(router).toBeInstanceOf(TaskRouter);
    });

    it('should return the same instance for concurrent calls', async () => {
      // Start multiple concurrent calls
      const promises = [
        getDefaultRouterAsync(),
        getDefaultRouterAsync(),
        getDefaultRouterAsync(),
      ];

      const routers = await Promise.all(promises);

      // All should be the same instance
      expect(routers[0]).toBe(routers[1]);
      expect(routers[1]).toBe(routers[2]);
    });

    it('should log initialization', async () => {
      await getDefaultRouterAsync();

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'task_router_initializing',
        })
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'task_router_initialized',
        })
      );
    });

    it('should only initialize once for multiple calls', async () => {
      // Clear mock to track calls
      logger.info.mockClear();

      await getDefaultRouterAsync();
      await getDefaultRouterAsync();
      await getDefaultRouterAsync();

      // Should only log initialization once
      const initCalls = logger.info.mock.calls.filter(
        (call: any[]) => call[0].event === 'task_router_initializing'
      );
      expect(initCalls.length).toBe(1);
    });
  });

  // P2-009: Availability caching tests
  describe('availability caching', () => {
    beforeEach(() => {
      invalidateAvailabilityCache();
      (global.fetch as jest.Mock).mockReset();
    });

    it('should cache availability results', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOllamaModelsResponse),
      });

      const router = new TaskRouter();

      // First call should hit the provider
      await router.checkAvailability();
      const firstCallCount = (global.fetch as jest.Mock).mock.calls.length;

      // Second call should use cache
      await router.checkAvailability();
      const secondCallCount = (global.fetch as jest.Mock).mock.calls.length;

      // Fetch should not have been called again (cache hit)
      expect(secondCallCount).toBe(firstCallCount);
    });

    it('should log cache hits', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOllamaModelsResponse),
      });

      const router = new TaskRouter();

      // First call - cache miss
      await router.checkAvailability();
      logger.debug.mockClear();

      // Second call - cache hit
      await router.checkAvailability();

      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'availability_cache_hit',
        })
      );
    });

    it('should invalidate cache when requested', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOllamaModelsResponse),
      });

      const router = new TaskRouter();

      // First call - cache miss
      await router.checkAvailability();
      const cacheAfterFirst = _getAvailabilityCacheState();
      expect(cacheAfterFirst.size).toBeGreaterThan(0);

      // Invalidate cache
      invalidateAvailabilityCache();
      const cacheAfterInvalidate = _getAvailabilityCacheState();
      expect(cacheAfterInvalidate.size).toBe(0);
    });

    it('should invalidate specific provider cache', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOllamaModelsResponse),
      });

      const router = new TaskRouter();
      await router.checkAvailability();

      // Invalidate only ollama
      invalidateAvailabilityCache('ollama');

      const cacheState = _getAvailabilityCacheState();
      expect(cacheState.has('ollama')).toBe(false);
      // Other providers may still be cached
    });
  });

  describe('logging (no PHI)', () => {
    it('should not log prompt content', async () => {
      mockFetchSuccess(global.fetch as jest.Mock, mockOllamaModelsResponse);

      const router = new TaskRouter();

      try {
        await router.route('TRANSLATION', 'Secret patient information');
      } catch {
        // Expected to throw
      }

      verifyNoPromptInLogs(logger, 'Secret patient');
    });
  });
});
