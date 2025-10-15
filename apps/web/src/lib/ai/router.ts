/**
 * AI Smart Router
 *
 * Routes AI requests to the most cost-effective provider based on:
 * - Query complexity
 * - Required accuracy
 * - Cost optimization
 * - Provider availability
 *
 * Default Strategy:
 * - Simple queries → Gemini Flash (cheapest, fastest)
 * - Complex/critical → Claude Sonnet (highest quality)
 * - Fallback chain: Gemini → Claude → OpenAI
 */

import { chat, type ChatRequest, type ChatResponse, type AIProvider } from './chat';

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
 * Smart router for AI requests
 */
export async function routeAIRequest(
  request: ChatRequest,
  config: Partial<RouterConfig> = {}
): Promise<ChatResponse & { provider: AIProvider }> {
  const fullConfig: RouterConfig = { ...DEFAULT_CONFIG, ...config };

  // Analyze query complexity
  const complexity = analyzeComplexity(request.messages);

  // Determine optimal provider based on complexity
  let selectedProvider = request.provider || fullConfig.complexityThresholds[complexity];

  // Override with primary provider if preferring cheapest
  if (fullConfig.preferCheapest && complexity !== 'critical') {
    selectedProvider = fullConfig.primaryProvider;
  }

  // Attempt request with selected provider
  console.log(`[AI Router] Routing ${complexity} query to ${selectedProvider}`);

  let response = await chat({
    ...request,
    provider: selectedProvider,
  });

  // Fallback logic if primary provider fails
  if (!response.success) {
    console.warn(`[AI Router] ${selectedProvider} failed, trying fallback...`);

    for (const fallbackProvider of fullConfig.fallbackProviders) {
      if (fallbackProvider === selectedProvider) continue;

      console.log(`[AI Router] Attempting fallback to ${fallbackProvider}`);

      response = await chat({
        ...request,
        provider: fallbackProvider,
      });

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
    `Tokens: ${response.usage?.totalTokens || 'N/A'}`
  );

  return {
    ...response,
    provider: selectedProvider,
  };
}

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
