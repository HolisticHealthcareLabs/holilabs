/**
 * Task-Based AI Router
 *
 * @deprecated P2-005: Use router.ts with unified types instead.
 * This file is retained for backward compatibility with legacy code using
 * SCREAMING_SNAKE_CASE task names (e.g., TRANSCRIPT_SUMMARY).
 *
 * Migration guide:
 * - Replace TaskRouter.route() with routeAIRequest() from router.ts
 * - Replace AITask with UnifiedAITask from types.ts
 * - Use normalizeTask() to convert legacy task names
 *
 * Routes AI requests to the optimal provider based on:
 * - Task type (clinical vs commodity)
 * - Privacy requirements (local vs cloud)
 * - Cost optimization
 * - Provider availability
 *
 * Strategy:
 * - TRANSCRIPT_SUMMARY → Ollama (fast, local, private)
 * - SOAP_GENERATION → Claude (complex reasoning)
 * - DRUG_INTERACTION → Claude (safety-critical)
 * - ICD_CODING → Together/Meditron (medical domain fine-tuned)
 * - TRANSLATION → Gemini (cheap, high volume)
 */

import { OllamaProvider, OLLAMA_MODELS } from './ollama-provider';
import { VLLMProvider, VLLM_MODELS } from './vllm-provider';
import { TogetherProvider, TOGETHER_MODELS } from './together-provider';
import { AIProvider } from '../provider-interface';
import logger from '@/lib/logger';

// P2-005: Import unified types for re-export
import {
  type UnifiedAITask,
  type LegacyAITask,
  type AIProviderType,
  type TaskConfig,
  LEGACY_TASK_MAP,
  UNIFIED_TASK_CONFIG,
  normalizeTask,
  getTaskConfig,
} from '../types';

// ============================================================================
// P2-009: Availability Caching with TTL
// ============================================================================

interface CachedAvailability {
  available: boolean;
  expires: number;
}

const availabilityCache = new Map<string, CachedAvailability>();
const AVAILABILITY_TTL = 30000; // 30 seconds

/**
 * Get cached availability for a provider
 * @returns cached availability or null if cache miss/expired
 */
function getCachedAvailability(provider: string): boolean | null {
  const cached = availabilityCache.get(provider);
  if (cached && Date.now() < cached.expires) {
    return cached.available;
  }
  return null;
}

/**
 * Cache availability status for a provider
 */
function setCachedAvailability(provider: string, available: boolean): void {
  availabilityCache.set(provider, {
    available,
    expires: Date.now() + AVAILABILITY_TTL,
  });
}

/**
 * Invalidate cached availability for a provider (e.g., on error)
 */
export function invalidateAvailabilityCache(provider?: string): void {
  if (provider) {
    availabilityCache.delete(provider);
  } else {
    availabilityCache.clear();
  }
}

/**
 * Get current cache state (for testing)
 * @internal
 */
export function _getAvailabilityCacheState(): Map<string, CachedAvailability> {
  return new Map(availabilityCache);
}

/**
 * Clinical AI task types
 */
export type AITask =
  | 'TRANSCRIPT_SUMMARY'    // Fast, local preferred
  | 'SOAP_GENERATION'       // Complex reasoning needed
  | 'DRUG_INTERACTION'      // Safety-critical, highest accuracy
  | 'PRESCRIPTION_REVIEW'   // Safety-critical
  | 'ICD_CODING'            // Medical domain expertise
  | 'LAB_INTERPRETATION'    // Accuracy important
  | 'DIFFERENTIAL_DIAGNOSIS'// Complex reasoning
  | 'PATIENT_EDUCATION'     // Template-based, cost-efficient
  | 'CLINICAL_NOTES'        // High volume, moderate complexity
  | 'TRANSLATION'           // Commodity task
  | 'BILLING_CODES'         // Lookup-like
  | 'SCHEDULING'            // Low stakes
  | 'REFERRAL_LETTER'       // Template-based
  | 'GENERAL';              // Default

/**
 * Provider type for routing
 */
export type ProviderType = 'ollama' | 'vllm' | 'together' | 'claude' | 'gemini' | 'openai';

/**
 * Model selection result
 */
export interface ModelSelection {
  provider: ProviderType;
  model: string;
  reason: string;
  estimatedLatency: 'fast' | 'medium' | 'slow';
  privacyLevel: 'local' | 'self-hosted' | 'cloud';
  estimatedCostPer1k: number; // USD per 1k tokens
}

/**
 * Default model for each provider type
 * P3-011: Centralized model defaults instead of duplicating in TASK_MODEL_MAP
 */
const DEFAULT_MODELS: Record<ProviderType, string> = {
  ollama: OLLAMA_MODELS.phi3,
  vllm: VLLM_MODELS.mistral7b,
  together: TOGETHER_MODELS.meditron7b,
  claude: 'claude-3-5-sonnet-20241022',
  gemini: 'gemini-1.5-flash',
  openai: 'gpt-4o',
};

/**
 * Convert unified TaskConfig to ModelSelection format
 * P3-011: Single function to convert from UNIFIED_TASK_CONFIG to legacy ModelSelection
 */
function taskConfigToModelSelection(config: TaskConfig): ModelSelection {
  return {
    provider: config.primaryProvider as ProviderType,
    model: DEFAULT_MODELS[config.primaryProvider as ProviderType],
    reason: config.rationale,
    estimatedLatency: config.estimatedLatency,
    privacyLevel: config.privacyLevel,
    estimatedCostPer1k: config.estimatedCostPer1k,
  };
}

/**
 * Get the recommended model for a task
 * P3-011: Now uses UNIFIED_TASK_CONFIG as single source of truth
 */
export function selectModelForTask(task: AITask): ModelSelection {
  // Normalize legacy SCREAMING_SNAKE_CASE to unified kebab-case
  const normalizedTask = normalizeTask(task);
  const config = UNIFIED_TASK_CONFIG[normalizedTask];
  return taskConfigToModelSelection(config);
}

/**
 * Router configuration
 */
export interface TaskRouterConfig {
  // Prefer local when available
  preferLocal: boolean;

  // Fallback providers in order
  fallbackChain: ProviderType[];

  // Force specific provider (override task-based routing)
  forceProvider?: ProviderType;

  // Ollama configuration
  ollamaBaseUrl?: string;
  ollamaModel?: string;

  // vLLM configuration
  vllmBaseUrl?: string;
  vllmModel?: string;

  // Together configuration
  togetherApiKey?: string;
  togetherModel?: string;
}

const DEFAULT_CONFIG: TaskRouterConfig = {
  preferLocal: true,
  fallbackChain: ['ollama', 'together', 'gemini', 'claude'],
};

/**
 * Task-based router for AI requests
 */
export class TaskRouter {
  private config: TaskRouterConfig;
  private ollamaProvider?: OllamaProvider;
  private vllmProvider?: VLLMProvider;
  private togetherProvider?: TogetherProvider;
  private providerAvailability: Map<ProviderType, boolean> = new Map();

  constructor(config: Partial<TaskRouterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize Ollama (local)
    try {
      this.ollamaProvider = new OllamaProvider({
        baseUrl: this.config.ollamaBaseUrl,
        model: this.config.ollamaModel,
      });
    } catch (error) {
      logger.warn({
        event: 'ollama_init_failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Initialize vLLM (self-hosted)
    try {
      this.vllmProvider = new VLLMProvider({
        baseUrl: this.config.vllmBaseUrl,
        model: this.config.vllmModel,
      });
    } catch (error) {
      logger.warn({
        event: 'vllm_init_failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Initialize Together (cloud)
    try {
      if (this.config.togetherApiKey || process.env.TOGETHER_API_KEY) {
        this.togetherProvider = new TogetherProvider({
          apiKey: this.config.togetherApiKey,
          model: this.config.togetherModel,
        });
      }
    } catch (error) {
      logger.warn({
        event: 'together_init_failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Check provider availability with caching
   *
   * P2-009: Uses TTL-based cache to avoid 100-500ms latency on every request.
   * Cache hits return immediately without network calls.
   */
  async checkAvailability(): Promise<Map<ProviderType, boolean>> {
    const checks: Array<Promise<void>> = [];

    // Check Ollama with cache
    if (this.ollamaProvider) {
      const cached = getCachedAvailability('ollama');
      if (cached !== null) {
        this.providerAvailability.set('ollama', cached);
        logger.debug({
          event: 'availability_cache_hit',
          provider: 'ollama',
          available: cached,
        });
      } else {
        checks.push(
          this.ollamaProvider.isAvailable().then((available) => {
            setCachedAvailability('ollama', available);
            this.providerAvailability.set('ollama', available);
            logger.debug({
              event: 'availability_cache_miss',
              provider: 'ollama',
              available,
            });
          }).catch(() => {
            // On error, mark as unavailable and invalidate cache
            setCachedAvailability('ollama', false);
            this.providerAvailability.set('ollama', false);
          })
        );
      }
    }

    // Check vLLM with cache
    if (this.vllmProvider) {
      const cached = getCachedAvailability('vllm');
      if (cached !== null) {
        this.providerAvailability.set('vllm', cached);
        logger.debug({
          event: 'availability_cache_hit',
          provider: 'vllm',
          available: cached,
        });
      } else {
        checks.push(
          this.vllmProvider.isAvailable().then((available) => {
            setCachedAvailability('vllm', available);
            this.providerAvailability.set('vllm', available);
            logger.debug({
              event: 'availability_cache_miss',
              provider: 'vllm',
              available,
            });
          }).catch(() => {
            setCachedAvailability('vllm', false);
            this.providerAvailability.set('vllm', false);
          })
        );
      }
    }

    // Check Together with cache
    if (this.togetherProvider) {
      const cached = getCachedAvailability('together');
      if (cached !== null) {
        this.providerAvailability.set('together', cached);
        logger.debug({
          event: 'availability_cache_hit',
          provider: 'together',
          available: cached,
        });
      } else {
        checks.push(
          this.togetherProvider.isAvailable().then((available) => {
            setCachedAvailability('together', available);
            this.providerAvailability.set('together', available);
            logger.debug({
              event: 'availability_cache_miss',
              provider: 'together',
              available,
            });
          }).catch(() => {
            setCachedAvailability('together', false);
            this.providerAvailability.set('together', false);
          })
        );
      }
    }

    // Cloud providers are assumed available (no cache needed)
    this.providerAvailability.set('claude', true);
    this.providerAvailability.set('gemini', true);
    this.providerAvailability.set('openai', true);

    await Promise.all(checks);
    return this.providerAvailability;
  }

  /**
   * Get provider instance for a provider type
   */
  getProvider(type: ProviderType): AIProvider | null {
    switch (type) {
      case 'ollama':
        return this.ollamaProvider || null;
      case 'vllm':
        return this.vllmProvider || null;
      case 'together':
        return this.togetherProvider || null;
      default:
        // Claude, Gemini, OpenAI are handled by chat.ts
        return null;
    }
  }

  /**
   * Route a request to the optimal provider
   */
  async route(
    task: AITask,
    prompt: string,
    context?: any
  ): Promise<{ response: string; provider: ProviderType; model: string }> {
    // Get recommended model for task
    let selection = selectModelForTask(task);

    // Override if forceProvider is set
    if (this.config.forceProvider) {
      selection = {
        ...selection,
        provider: this.config.forceProvider,
        reason: 'Forced provider override',
      };
    }

    // Check if preferred provider is available
    await this.checkAvailability();

    // If preferred not available, use fallback chain
    let activeProvider = selection.provider;
    if (!this.providerAvailability.get(activeProvider)) {
      for (const fallback of this.config.fallbackChain) {
        if (this.providerAvailability.get(fallback)) {
          logger.info({
            event: 'task_router_fallback',
            task,
            originalProvider: activeProvider,
            fallbackProvider: fallback,
          });
          activeProvider = fallback;
          break;
        }
      }
    }

    logger.info({
      event: 'task_router_request',
      task,
      provider: activeProvider,
      model: selection.model,
      reason: selection.reason,
    });

    // Execute request with selected provider
    const provider = this.getProvider(activeProvider);

    if (provider) {
      const response = await provider.generateResponse(prompt, context);
      return {
        response,
        provider: activeProvider,
        model: selection.model,
      };
    }

    // For cloud providers not handled here, throw to let caller use chat.ts
    throw new Error(`Provider ${activeProvider} requires external routing via chat.ts`);
  }

  /**
   * Quick routing helpers
   */
  async transcriptSummary(prompt: string, context?: any) {
    return this.route('TRANSCRIPT_SUMMARY', prompt, context);
  }

  async soapGeneration(prompt: string, context?: any) {
    return this.route('SOAP_GENERATION', prompt, context);
  }

  async drugInteraction(prompt: string, context?: any) {
    return this.route('DRUG_INTERACTION', prompt, context);
  }

  async icdCoding(prompt: string, context?: any) {
    return this.route('ICD_CODING', prompt, context);
  }

  async clinicalNotes(prompt: string, context?: any) {
    return this.route('CLINICAL_NOTES', prompt, context);
  }

  async translation(prompt: string, context?: any) {
    return this.route('TRANSLATION', prompt, context);
  }
}

// ============================================================================
// P2-008: Race-Free Singleton Pattern
// ============================================================================

/**
 * Promise-based singleton to prevent race conditions during initialization.
 * Concurrent calls to getDefaultRouter() will all receive the same instance.
 */
let defaultRouterPromise: Promise<TaskRouter> | null = null;
let defaultRouterInstance: TaskRouter | null = null;

/**
 * Initialize the router (internal)
 */
async function initializeRouter(): Promise<TaskRouter> {
  logger.info({ event: 'task_router_initializing' });
  const router = new TaskRouter();
  // Pre-warm the availability cache
  await router.checkAvailability();
  logger.info({ event: 'task_router_initialized' });
  return router;
}

/**
 * Get the default TaskRouter instance (async, race-free).
 *
 * P2-008: Uses Promise-based singleton pattern to prevent race conditions
 * when multiple concurrent requests try to initialize the router.
 *
 * @example
 * const router = await getDefaultRouterAsync();
 * const result = await router.route('DRUG_INTERACTION', prompt);
 */
export async function getDefaultRouterAsync(): Promise<TaskRouter> {
  if (defaultRouterInstance) {
    return defaultRouterInstance;
  }

  if (!defaultRouterPromise) {
    defaultRouterPromise = initializeRouter()
      .then((router) => {
        defaultRouterInstance = router;
        return router;
      })
      .catch((error) => {
        // Reset promise on error to allow retry
        defaultRouterPromise = null;
        logger.error({
          event: 'task_router_init_failed',
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      });
  }

  return defaultRouterPromise;
}

/**
 * Get the default TaskRouter instance (sync, backwards compatible).
 *
 * @deprecated Use getDefaultRouterAsync() for race-free initialization.
 * This synchronous version maintains backward compatibility but may have
 * race conditions under concurrent initialization.
 */
export function getDefaultRouter(): TaskRouter {
  if (!defaultRouterInstance) {
    // Create immediately for backwards compatibility
    defaultRouterInstance = new TaskRouter();
  }
  return defaultRouterInstance;
}

/**
 * Reset the singleton (for testing)
 * @internal
 */
export function _resetDefaultRouter(): void {
  defaultRouterPromise = null;
  defaultRouterInstance = null;
  invalidateAvailabilityCache();
}

// ============================================================================
// P2-005: Re-exports for Unified Types (Backward Compatibility)
// ============================================================================

/**
 * Re-export unified types for consumers migrating from task-router.
 * @see types.ts for canonical type definitions
 */
export {
  type UnifiedAITask,
  type LegacyAITask,
  LEGACY_TASK_MAP,
  normalizeTask,
  getTaskConfig,
} from '../types';

/**
 * Convert legacy AITask to unified task format
 * @deprecated Use normalizeTask from types.ts directly
 */
export function toLegacyTask(task: AITask): UnifiedAITask {
  return normalizeTask(task);
}
