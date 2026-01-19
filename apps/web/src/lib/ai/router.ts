/**
 * AI Smart Router
 *
 * Routes AI requests to the most cost-effective provider based on:
 * - Query complexity
 * - Required accuracy
 * - Task type
 * - Cost optimization
 * - Provider availability
 *
 * Default Strategy:
 * - Simple queries → Gemini Flash (cheapest, fastest)
 * - Complex/critical → Claude Sonnet (highest quality)
 * - Fallback chain: Gemini → Claude → OpenAI
 *
 * Task-Based Routing:
 * - High-volume commodity tasks → Gemini (cost optimization)
 * - Clinical decisions requiring accuracy → Claude (safety)
 */

import { chat, type ChatRequest, type ChatResponse, type AIProvider } from './chat';
import logger from '@/lib/logger';

export type QueryComplexity = 'simple' | 'moderate' | 'complex' | 'critical';

/**
 * Task-based model routing for cost optimization
 *
 * "The cheapest token is the one you never send."
 * - Commodity tasks → Gemini (cheap, fast)
 * - Safety-critical → Claude (accurate)
 */
export type ClinicalTask =
  | 'translation'           // Simple, high-volume
  | 'summarization'         // Commodity task
  | 'drug-interaction'      // Needs accuracy - ALWAYS CLAUDE
  | 'diagnosis-support'     // Critical - ALWAYS CLAUDE
  | 'prescription-review'   // Safety-critical - ALWAYS CLAUDE
  | 'scheduling'            // Low stakes
  | 'billing-codes'         // Lookup-like
  | 'patient-education'     // Template-based
  | 'clinical-notes'        // Moderate complexity
  | 'lab-interpretation'    // Needs accuracy
  | 'referral-letter'       // Template-based
  | 'general';              // Default routing

const TASK_MODEL_MAP: Record<ClinicalTask, AIProvider> = {
  'translation': 'gemini',        // Simple, high-volume
  'summarization': 'gemini',      // Commodity task
  'drug-interaction': 'claude',   // SAFETY: Needs accuracy
  'diagnosis-support': 'claude',  // CRITICAL: Always highest quality
  'prescription-review': 'claude', // SAFETY: Drug dosing/interactions
  'scheduling': 'gemini',         // Low stakes, high volume
  'billing-codes': 'gemini',      // Lookup-like, deterministic
  'patient-education': 'gemini',  // Template-based content
  'clinical-notes': 'gemini',     // Moderate complexity, high volume
  'lab-interpretation': 'claude', // Needs accuracy for abnormal values
  'referral-letter': 'gemini',    // Template-based, low risk
  'general': 'gemini',            // Default to cost-efficient
};

/**
 * Get the recommended provider for a clinical task
 */
export function getProviderForTask(task: ClinicalTask): AIProvider {
  return TASK_MODEL_MAP[task] || 'gemini';
}

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
 * Extended request with task-based routing
 */
export interface TaskAwareRequest extends ChatRequest {
  task?: ClinicalTask;
}

/**
 * Smart router for AI requests
 *
 * Supports:
 * 1. Task-based routing (explicit task type)
 * 2. Complexity-based routing (analyzed from content)
 * 3. Explicit provider override
 * 4. Fallback chain on failure
 */
export async function routeAIRequest(
  request: TaskAwareRequest,
  config: Partial<RouterConfig> = {}
): Promise<ChatResponse & { provider: AIProvider; complexity: QueryComplexity }> {
  const fullConfig: RouterConfig = { ...DEFAULT_CONFIG, ...config };

  // Analyze query complexity
  const complexity = analyzeComplexity(request.messages);

  // Determine optimal provider (priority: explicit > task-based > complexity-based)
  let selectedProvider: AIProvider;
  let routingReason: string;

  if (request.provider) {
    // Explicit provider override
    selectedProvider = request.provider;
    routingReason = 'explicit_override';
  } else if (request.task) {
    // Task-based routing
    selectedProvider = getProviderForTask(request.task);
    routingReason = `task_${request.task}`;
  } else {
    // Complexity-based routing
    selectedProvider = fullConfig.complexityThresholds[complexity];
    routingReason = `complexity_${complexity}`;

    // Override with primary provider if preferring cheapest and not critical
    if (fullConfig.preferCheapest && complexity !== 'critical') {
      selectedProvider = fullConfig.primaryProvider;
      routingReason = 'cost_optimization';
    }
  }

  logger.info({
    event: 'ai_router_request',
    selectedProvider,
    complexity,
    task: request.task,
    routingReason,
    messageCount: request.messages.length,
  });

  let response = await chat({
    ...request,
    provider: selectedProvider,
  });

  // Fallback logic if primary provider fails
  if (!response.success) {
    logger.warn({
      event: 'ai_router_fallback_triggered',
      failedProvider: selectedProvider,
      error: response.error,
    });

    for (const fallbackProvider of fullConfig.fallbackProviders) {
      if (fallbackProvider === selectedProvider) continue;

      logger.info({
        event: 'ai_router_fallback_attempt',
        fallbackProvider,
      });

      response = await chat({
        ...request,
        provider: fallbackProvider,
      });

      if (response.success) {
        selectedProvider = fallbackProvider;
        logger.info({
          event: 'ai_router_fallback_success',
          fallbackProvider,
        });
        break;
      }
    }
  }

  // Log routing decision for analytics/cost monitoring
  const estimatedCost = response.usage
    ? getEstimatedCost(selectedProvider, response.usage.totalTokens)
    : getEstimatedCost(selectedProvider);

  logger.info({
    event: 'ai_router_request_completed',
    provider: selectedProvider,
    complexity,
    task: request.task,
    estimatedCostCents: estimatedCost,
    totalTokens: response.usage?.totalTokens,
    success: response.success,
  });

  return {
    ...response,
    provider: selectedProvider,
    complexity,
  };
}

/**
 * Route a request by clinical task type
 * Preferred method for task-specific routing
 */
export async function routeByTask(
  task: ClinicalTask,
  messages: ChatRequest['messages'],
  options?: Partial<ChatRequest>
): Promise<ChatResponse & { provider: AIProvider; complexity: QueryComplexity }> {
  return routeAIRequest({
    messages,
    task,
    ...options,
  });
}

/**
 * Quick helpers for specific use cases
 * Uses task-based routing for optimal cost/accuracy balance
 */
export const AIRouter = {
  /**
   * For general clinical questions (uses Gemini Flash)
   */
  general: (messages: ChatRequest['messages']) =>
    routeByTask('general', messages),

  /**
   * For differential diagnosis (uses Claude for accuracy)
   */
  differential: (messages: ChatRequest['messages']) =>
    routeByTask('diagnosis-support', messages),

  /**
   * For drug interactions (uses Claude for safety) - ALWAYS CLAUDE
   */
  drugInteractions: (messages: ChatRequest['messages']) =>
    routeByTask('drug-interaction', messages),

  /**
   * For prescription review (uses Claude for safety) - ALWAYS CLAUDE
   */
  prescriptionReview: (messages: ChatRequest['messages']) =>
    routeByTask('prescription-review', messages),

  /**
   * For lab interpretation (uses Claude for accuracy)
   */
  labInterpretation: (messages: ChatRequest['messages']) =>
    routeByTask('lab-interpretation', messages),

  /**
   * For treatment protocols (uses Gemini for cost-efficiency)
   */
  treatment: (messages: ChatRequest['messages']) =>
    routeByTask('general', messages),

  /**
   * For clinical notes/summarization (uses Gemini - high volume)
   */
  clinicalNotes: (messages: ChatRequest['messages']) =>
    routeByTask('clinical-notes', messages),

  /**
   * For patient education materials (uses Gemini - template-based)
   */
  patientEducation: (messages: ChatRequest['messages']) =>
    routeByTask('patient-education', messages),

  /**
   * For translation (uses Gemini - high volume, commodity)
   */
  translation: (messages: ChatRequest['messages']) =>
    routeByTask('translation', messages),

  /**
   * For billing codes (uses Gemini - lookup-like)
   */
  billingCodes: (messages: ChatRequest['messages']) =>
    routeByTask('billing-codes', messages),

  /**
   * For scheduling (uses Gemini - low stakes)
   */
  scheduling: (messages: ChatRequest['messages']) =>
    routeByTask('scheduling', messages),

  /**
   * Auto-route based on complexity analysis
   */
  auto: (messages: ChatRequest['messages']) =>
    routeAIRequest({ messages }),

  /**
   * Route by explicit task type
   */
  byTask: routeByTask,
};
