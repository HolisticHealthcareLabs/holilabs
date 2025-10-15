/**
 * AI Usage Tracking System
 *
 * Tracks all AI API usage for:
 * - Cost monitoring and budgeting
 * - Usage analytics per user/clinic
 * - Provider performance comparison
 * - Billing and freemium enforcement
 *
 * Metrics Tracked:
 * - Provider used (claude, gemini, openai)
 * - Token usage (input + output)
 * - Estimated cost in USD
 * - Response time
 * - Cache hit/miss
 * - User/Clinic association
 */

import type { AIProvider, ChatResponse } from './chat';

export interface UsageMetrics {
  // Request Info
  provider: AIProvider;
  userId?: string;
  clinicId?: string;

  // Token Metrics
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;

  // Cost Metrics (in USD)
  estimatedCost: number;

  // Performance Metrics
  responseTimeMs: number;
  fromCache: boolean;

  // Context
  queryComplexity?: 'simple' | 'moderate' | 'complex' | 'critical';
  feature?: string; // e.g., 'diagnosis', 'prescriptions', 'clinical-notes'

  // Timestamps
  timestamp: Date;
}

export interface DailyUsageSummary {
  date: string;
  totalQueries: number;
  totalTokens: number;
  totalCost: number;
  cacheHitRate: number;
  providerBreakdown: {
    gemini: { count: number; cost: number };
    claude: { count: number; cost: number };
    openai: { count: number; cost: number };
  };
}

/**
 * Cost per 1M tokens (input + output averaged)
 */
const PROVIDER_COSTS: Record<AIProvider, { input: number; output: number }> = {
  gemini: {
    input: 0.075,    // $0.075 per 1M tokens
    output: 0.30,    // $0.30 per 1M tokens
  },
  claude: {
    input: 3.00,     // $3.00 per 1M tokens
    output: 15.00,   // $15.00 per 1M tokens
  },
  openai: {
    input: 5.00,     // $5.00 per 1M tokens (GPT-4 Turbo)
    output: 15.00,   // $15.00 per 1M tokens
  },
};

/**
 * Calculate estimated cost based on token usage
 */
export function calculateCost(
  provider: AIProvider,
  promptTokens: number,
  completionTokens: number
): number {
  const costs = PROVIDER_COSTS[provider];

  const inputCost = (promptTokens / 1_000_000) * costs.input;
  const outputCost = (completionTokens / 1_000_000) * costs.output;

  return inputCost + outputCost;
}

/**
 * Track AI usage
 */
export async function trackUsage(
  metrics: Omit<UsageMetrics, 'estimatedCost' | 'timestamp'>
): Promise<void> {
  try {
    // Calculate cost
    const estimatedCost = calculateCost(
      metrics.provider,
      metrics.promptTokens,
      metrics.completionTokens
    );

    const fullMetrics: UsageMetrics = {
      ...metrics,
      estimatedCost,
      timestamp: new Date(),
    };

    // Log to console for now (will add database logging next)
    console.log(
      `[AI Usage] ${metrics.provider} | ` +
      `Tokens: ${metrics.totalTokens} | ` +
      `Cost: $${estimatedCost.toFixed(4)} | ` +
      `Cache: ${metrics.fromCache ? 'HIT' : 'MISS'} | ` +
      `Time: ${metrics.responseTimeMs}ms | ` +
      `User: ${metrics.userId || 'N/A'}`
    );

    // TODO: Store in database (PostgreSQL) when schema is ready
    // await prisma.aiUsageLog.create({ data: fullMetrics });

  } catch (error) {
    console.error('[AI Usage] Error tracking usage:', error);
  }
}

/**
 * Wrapper function to track usage from ChatResponse
 */
export async function trackFromResponse(
  response: ChatResponse & { provider?: AIProvider },
  options: {
    userId?: string;
    clinicId?: string;
    responseTimeMs: number;
    fromCache?: boolean;
    queryComplexity?: UsageMetrics['queryComplexity'];
    feature?: string;
  }
): Promise<void> {
  if (!response.usage) {
    console.warn('[AI Usage] No usage data in response');
    return;
  }

  await trackUsage({
    provider: response.provider || 'claude',
    userId: options.userId,
    clinicId: options.clinicId,
    promptTokens: response.usage.promptTokens,
    completionTokens: response.usage.completionTokens,
    totalTokens: response.usage.totalTokens,
    responseTimeMs: options.responseTimeMs,
    fromCache: options.fromCache || false,
    queryComplexity: options.queryComplexity,
    feature: options.feature,
  });
}

/**
 * Get usage summary for a time period (mocked for now)
 * TODO: Implement with real database queries
 */
export async function getUsageSummary(
  startDate: Date,
  endDate: Date,
  options?: { userId?: string; clinicId?: string }
): Promise<DailyUsageSummary[]> {
  // Mock implementation
  console.log('[AI Usage] Getting summary from', startDate, 'to', endDate);

  return [];
}

/**
 * Check if user has exceeded their quota
 * Used for freemium tier enforcement
 */
export async function checkUserQuota(
  userId: string,
  tier: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE'
): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
  resetDate: Date;
}> {
  // Quota limits per tier (queries per day)
  const quotas: Record<typeof tier, number> = {
    FREE: 10,
    STARTER: 50,
    PRO: 999999, // Unlimited
    ENTERPRISE: 999999, // Unlimited
  };

  const limit = quotas[tier];

  // TODO: Query database for today's usage
  const todayUsage = 0; // Mock

  const remaining = Math.max(0, limit - todayUsage);
  const allowed = remaining > 0;

  // Reset at midnight
  const resetDate = new Date();
  resetDate.setHours(24, 0, 0, 0);

  return {
    allowed,
    remaining,
    limit,
    resetDate,
  };
}

/**
 * Cost monitoring alerts
 */
export async function checkCostAlerts(
  clinicId: string
): Promise<{
  isOverBudget: boolean;
  currentSpend: number;
  monthlyBudget: number;
  percentUsed: number;
}> {
  // Mock implementation
  const monthlyBudget = 100.00; // $100/month
  const currentSpend = 0; // TODO: Query database

  const percentUsed = (currentSpend / monthlyBudget) * 100;
  const isOverBudget = currentSpend > monthlyBudget;

  if (isOverBudget) {
    console.warn(
      `[AI Usage] 🚨 Clinic ${clinicId} is over budget! ` +
      `Spent: $${currentSpend.toFixed(2)} / $${monthlyBudget.toFixed(2)}`
    );
  }

  return {
    isOverBudget,
    currentSpend,
    monthlyBudget,
    percentUsed,
  };
}

/**
 * Export cost comparison between providers
 */
export function compareProviderCosts(tokenCount: number = 10000): {
  provider: AIProvider;
  costPer10kTokens: number;
  costSavingsVsClaude: string;
}[] {
  const results = (Object.keys(PROVIDER_COSTS) as AIProvider[]).map(provider => {
    // Assume 50/50 input/output split
    const inputTokens = tokenCount / 2;
    const outputTokens = tokenCount / 2;

    const cost = calculateCost(provider, inputTokens, outputTokens);

    return {
      provider,
      costPer10kTokens: cost,
    };
  });

  // Sort by cost (cheapest first)
  results.sort((a, b) => a.costPer10kTokens - b.costPer10kTokens);

  // Calculate savings vs Claude
  const claudeCost = results.find(r => r.provider === 'claude')!.costPer10kTokens;

  return results.map(r => ({
    provider: r.provider,
    costPer10kTokens: r.costPer10kTokens,
    costSavingsVsClaude:
      r.provider === 'claude'
        ? 'baseline'
        : `${((1 - r.costPer10kTokens / claudeCost) * 100).toFixed(1)}% cheaper`,
  }));
}

/**
 * Pretty print cost comparison
 */
export function printCostComparison(): void {
  console.log('\n💰 AI Provider Cost Comparison (per 10k tokens):\n');

  const comparison = compareProviderCosts(10000);

  comparison.forEach(c => {
    console.log(
      `  ${c.provider.padEnd(10)} | $${c.costPer10kTokens.toFixed(4)} | ${c.costSavingsVsClaude}`
    );
  });

  console.log('');
}
