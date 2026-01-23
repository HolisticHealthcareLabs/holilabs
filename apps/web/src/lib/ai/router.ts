/**
 * AI Smart Router
 *
 * Routes AI requests to the most cost-effective provider based on:
 * - Query complexity
 * - Required accuracy
 * - Cost optimization
 * - Provider availability (with circuit breaker pattern)
 *
 * Default Strategy:
 * - Simple queries → Gemini Flash (cheapest, fastest)
 * - Complex/critical → Claude Sonnet (highest quality)
 * - Fallback chain: Gemini → Claude → OpenAI
 *
 * Availability Features:
 * - Circuit breaker: Automatically disables failing providers
 * - Proactive health checks: Verify providers before routing
 * - Smart failover: Route around known-down providers
 */

import { chat, type ChatRequest, type ChatResponse, type AIProvider } from './chat';
import {
  getProviderStatus,
  recordSuccess,
  recordFailure,
  getBestAvailableProvider,
  getAllProviderStatuses,
  checkProviderHealth,
  clearAvailabilityCache,
  type ProviderStatus,
  type AvailabilityConfig,
} from './availability-cache';

export type QueryComplexity = 'simple' | 'moderate' | 'complex' | 'critical';

export interface RouterConfig {
  // Provider preferences
  primaryProvider: AIProvider;
  fallbackProviders: AIProvider[];

  // Cost optimization
  preferCheapest: boolean;
  maxCostPerQuery: number; // in USD cents

  // Quality settings
  minAccuracyThreshold: number; // 0-1

  // Routing rules
  complexityThresholds: {
    simple: AIProvider;      // Default: gemini
    moderate: AIProvider;    // Default: gemini
    complex: AIProvider;     // Default: claude
    critical: AIProvider;    // Default: claude
  };

  // Availability settings
  useAvailabilityCache: boolean;
  availabilityConfig?: Partial<AvailabilityConfig>;
}

const DEFAULT_CONFIG: RouterConfig = {
  primaryProvider: 'gemini',
  fallbackProviders: ['claude', 'openai'],
  preferCheapest: true,
  maxCostPerQuery: 5, // 5 cents max per query
  minAccuracyThreshold: 0.85,
  complexityThresholds: {
    simple: 'gemini',      // Gemini Flash: $0.001/query
    moderate: 'gemini',    // Gemini Flash: $0.001/query
    complex: 'claude',     // Claude Sonnet: $0.03/query
    critical: 'claude',    // Claude Sonnet: $0.03/query (highest accuracy)
  },
  useAvailabilityCache: true,
};

/**
 * Analyze query to determine complexity
 */
function analyzeComplexity(messages: ChatRequest['messages']): QueryComplexity {
  const lastMessage = messages[messages.length - 1]?.content || '';
  const messageLength = lastMessage.length;
  const conversationLength = messages.length;

  // Keywords indicating critical medical decisions
  const criticalKeywords = [
    'emergency', 'emergencia', 'urgente', 'acute', 'agudo',
    'severe', 'severo', 'crisis', 'shock', 'code',
    'mortality', 'mortalidad', 'life-threatening', 'fatal',
  ];

  // Keywords indicating complex analysis needed
  const complexKeywords = [
    'differential', 'diagnosis', 'diagnóstico', 'interaction', 'interacción',
    'contraindication', 'contraindicación', 'adverse', 'adverso',
    'protocol', 'protocolo', 'guideline', 'guía',
  ];

  // Check for critical cases
  const hasCriticalKeywords = criticalKeywords.some(keyword =>
    lastMessage.toLowerCase().includes(keyword)
  );

  if (hasCriticalKeywords) {
    return 'critical';
  }

  // Check for complex cases
  const hasComplexKeywords = complexKeywords.some(keyword =>
    lastMessage.toLowerCase().includes(keyword)
  );

  if (hasComplexKeywords || messageLength > 1000 || conversationLength > 5) {
    return 'complex';
  }

  // Check for moderate cases
  if (messageLength > 300 || conversationLength > 2) {
    return 'moderate';
  }

  return 'simple';
}

/**
 * Get estimated cost for a provider (in USD cents)
 */
function getEstimatedCost(
  provider: AIProvider,
  tokenCount: number = 2000
): number {
  // Cost per 1M tokens (input + output average)
  const costs: Record<AIProvider, number> = {
    gemini: 0.1875,    // $0.075 input + $0.30 output / 1M = ~$0.001 per 2k tokens
    claude: 9.0,       // $3 input + $15 output / 1M = ~$0.03 per 2k tokens
    openai: 10.0,      // $5 input + $15 output / 1M = ~$0.04 per 2k tokens
  };

  return (costs[provider] * tokenCount) / 10000; // Convert to cents per query
}

/**
 * Check if provider is available based on circuit breaker state
 */
async function isProviderAvailable(
  provider: AIProvider,
  config: Partial<AvailabilityConfig> = {}
): Promise<boolean> {
  const status = await getProviderStatus(provider, config);

  // Available if no status cached (unknown) or circuit is not open
  if (!status) return true;
  return status.circuitState !== 'open';
}

/**
 * Get the first available provider from a list
 */
async function getFirstAvailableProvider(
  providers: AIProvider[],
  config: Partial<AvailabilityConfig> = {}
): Promise<AIProvider | null> {
  for (const provider of providers) {
    if (await isProviderAvailable(provider, config)) {
      return provider;
    }
  }
  return null;
}

/**
 * Smart router for AI requests with availability-aware routing
 */
export async function routeAIRequest(
  request: ChatRequest,
  config: Partial<RouterConfig> = {}
): Promise<ChatResponse & { provider: AIProvider; routingMetadata?: RoutingMetadata }> {
  const fullConfig: RouterConfig = { ...DEFAULT_CONFIG, ...config };
  const startTime = Date.now();

  // Analyze query complexity
  const complexity = analyzeComplexity(request.messages);

  // Determine optimal provider based on complexity
  let selectedProvider: AIProvider;

  // If provider explicitly specified, respect it
  if (request.provider) {
    selectedProvider = request.provider;
  }
  // Override with primary provider if preferring cheapest (for non-critical queries)
  else if (fullConfig.preferCheapest && complexity !== 'critical') {
    selectedProvider = fullConfig.primaryProvider;
  }
  // Use complexity-based routing
  else {
    selectedProvider = fullConfig.complexityThresholds[complexity];
  }

  // Check availability if enabled
  if (fullConfig.useAvailabilityCache) {
    const availabilityConfig = fullConfig.availabilityConfig || {};

    // Check if selected provider is available
    const isAvailable = await isProviderAvailable(selectedProvider, availabilityConfig);

    if (!isAvailable) {
      console.warn(`[AI Router] ${selectedProvider} circuit is open, finding alternative...`);

      // Find first available fallback
      const allProviders = [selectedProvider, ...fullConfig.fallbackProviders];
      const availableProvider = await getFirstAvailableProvider(
        allProviders.filter(p => p !== selectedProvider),
        availabilityConfig
      );

      if (availableProvider) {
        console.log(`[AI Router] Routing to ${availableProvider} (circuit open for ${selectedProvider})`);
        selectedProvider = availableProvider;
      } else {
        // All circuits open - try the primary anyway (it might have recovered)
        console.warn(`[AI Router] All providers have open circuits, trying ${selectedProvider} anyway`);
      }
    }
  }

  // Attempt request with selected provider
  console.log(`[AI Router] Routing ${complexity} query to ${selectedProvider}`);

  let response = await chat({
    ...request,
    provider: selectedProvider,
  });

  const responseTimeMs = Date.now() - startTime;

  // Record availability metrics if enabled
  if (fullConfig.useAvailabilityCache) {
    const availabilityConfig = fullConfig.availabilityConfig || {};

    if (response.success) {
      await recordSuccess(selectedProvider, responseTimeMs, availabilityConfig);
    } else {
      await recordFailure(selectedProvider, response.error || 'Unknown error', availabilityConfig);
    }
  }

  // Fallback logic if primary provider fails
  if (!response.success) {
    console.warn(`[AI Router] ${selectedProvider} failed, trying fallback...`);

    for (const fallbackProvider of fullConfig.fallbackProviders) {
      if (fallbackProvider === selectedProvider) continue;

      // Check availability before trying fallback
      if (fullConfig.useAvailabilityCache) {
        const isAvailable = await isProviderAvailable(
          fallbackProvider,
          fullConfig.availabilityConfig || {}
        );
        if (!isAvailable) {
          console.log(`[AI Router] Skipping ${fallbackProvider} (circuit open)`);
          continue;
        }
      }

      console.log(`[AI Router] Attempting fallback to ${fallbackProvider}`);

      const fallbackStartTime = Date.now();
      response = await chat({
        ...request,
        provider: fallbackProvider,
      });
      const fallbackResponseTime = Date.now() - fallbackStartTime;

      // Record availability metrics for fallback
      if (fullConfig.useAvailabilityCache) {
        const availabilityConfig = fullConfig.availabilityConfig || {};
        if (response.success) {
          await recordSuccess(fallbackProvider, fallbackResponseTime, availabilityConfig);
        } else {
          await recordFailure(fallbackProvider, response.error || 'Unknown error', availabilityConfig);
        }
      }

      if (response.success) {
        selectedProvider = fallbackProvider;
        console.log(`[AI Router] Fallback successful: ${fallbackProvider}`);
        break;
      }
    }
  }

  // Log routing decision for analytics
  const estimatedCost = response.usage
    ? getEstimatedCost(selectedProvider, response.usage.totalTokens)
    : getEstimatedCost(selectedProvider);

  console.log(
    `[AI Router] Request completed | Provider: ${selectedProvider} | ` +
    `Complexity: ${complexity} | Cost: ~$${estimatedCost.toFixed(4)} | ` +
    `Tokens: ${response.usage?.totalTokens || 'N/A'} | ` +
    `Time: ${responseTimeMs}ms`
  );

  // Determine the originally selected provider for fallback detection
  const originalProvider = request.provider
    || (fullConfig.preferCheapest && complexity !== 'critical'
        ? fullConfig.primaryProvider
        : fullConfig.complexityThresholds[complexity]);

  return {
    ...response,
    provider: selectedProvider,
    routingMetadata: {
      complexity,
      estimatedCostCents: estimatedCost,
      responseTimeMs,
      usedFallback: selectedProvider !== originalProvider,
    },
  };
}

/**
 * Routing metadata included in response
 */
export interface RoutingMetadata {
  complexity: QueryComplexity;
  estimatedCostCents: number;
  responseTimeMs: number;
  usedFallback: boolean;
}

// Re-export availability functions for convenience
export {
  getProviderStatus,
  getAllProviderStatuses,
  checkProviderHealth,
  clearAvailabilityCache,
} from './availability-cache';

/**
 * Quick helpers for specific use cases
 */
export const AIRouter = {
  /**
   * For general clinical questions (uses Gemini Flash)
   */
  general: (messages: ChatRequest['messages']) =>
    routeAIRequest({ messages, provider: 'gemini' }),

  /**
   * For differential diagnosis (uses Claude for accuracy)
   */
  differential: (messages: ChatRequest['messages']) =>
    routeAIRequest({
      messages,
      provider: 'claude',
    }),

  /**
   * For drug interactions (uses Claude for safety)
   */
  drugInteractions: (messages: ChatRequest['messages']) =>
    routeAIRequest({
      messages,
      provider: 'claude',
    }),

  /**
   * For treatment protocols (uses Gemini for cost-efficiency)
   */
  treatment: (messages: ChatRequest['messages']) =>
    routeAIRequest({ messages, provider: 'gemini' }),

  /**
   * Auto-route based on complexity analysis
   */
  auto: (messages: ChatRequest['messages']) =>
    routeAIRequest({ messages }),
};
