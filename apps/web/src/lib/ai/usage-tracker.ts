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
 *
 * PHI Security:
 * - promptPreview REMOVED (contained PHI)
 * - promptHash used for debugging (SHA-256, no PHI)
 * - appointmentId links to clinical encounter for audit trail
 */

import type { AIProvider, ChatResponse } from './chat';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { createHash } from 'crypto';

/**
 * Create SHA-256 hash of prompt for debugging
 * This allows tracing without storing PHI
 */
export function hashPrompt(prompt: string): string {
  return createHash('sha256').update(prompt).digest('hex');
}

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
  providerBreakdown: Record<AIProvider, { count: number; cost: number }>;
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
  ollama: {
    input: 0,        // Local inference - no cost
    output: 0,
  },
  vllm: {
    input: 0,        // Self-hosted - infrastructure cost only
    output: 0,
  },
  together: {
    input: 0.20,     // ~$0.20 per 1M tokens for 7B models
    output: 0.20,
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
 * Track AI usage - persists to database for CFO visibility
 *
 * PHI Security:
 * - DO NOT pass raw prompts - use prompt parameter and we'll hash it
 * - appointmentId links to clinical encounter for audit trail
 */
export async function trackUsage(
  metrics: Omit<UsageMetrics, 'estimatedCost' | 'timestamp'> & {
    patientId?: string;
    model?: string;
    prompt?: string; // We hash this - NEVER stored raw
    appointmentId?: string; // Links to clinical encounter for audit
  }
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

    // Hash prompt for debugging (PHI-safe)
    const promptHash = metrics.prompt ? hashPrompt(metrics.prompt) : undefined;

    // Structured logging for observability
    logger.info({
      event: 'ai_usage_tracked',
      provider: metrics.provider,
      model: metrics.model,
      totalTokens: metrics.totalTokens,
      estimatedCost,
      fromCache: metrics.fromCache,
      responseTimeMs: metrics.responseTimeMs,
      userId: metrics.userId,
      clinicId: metrics.clinicId,
      feature: metrics.feature,
      queryComplexity: metrics.queryComplexity,
      appointmentId: metrics.appointmentId,
      promptHash, // Safe to log - SHA-256 hash only
    });

    // Persist to database for CFO dashboard and cost analytics
    await prisma.aIUsageLog.create({
      data: {
        provider: metrics.provider,
        model: metrics.model,
        userId: metrics.userId,
        clinicId: metrics.clinicId,
        patientId: metrics.patientId,
        appointmentId: metrics.appointmentId, // Audit trail - links to encounter
        promptTokens: metrics.promptTokens,
        completionTokens: metrics.completionTokens,
        totalTokens: metrics.totalTokens,
        estimatedCost,
        responseTimeMs: metrics.responseTimeMs,
        fromCache: metrics.fromCache,
        queryComplexity: metrics.queryComplexity,
        feature: metrics.feature,
        promptHash, // PHI-safe: SHA-256 hash for debugging/deduplication
      },
    });

  } catch (error) {
    // Don't fail the main request if usage tracking fails
    logger.error({
      event: 'ai_usage_tracking_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
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
 * Get usage summary for a time period
 * Returns daily breakdown of AI usage for CFO dashboard
 */
export async function getUsageSummary(
  startDate: Date,
  endDate: Date,
  options?: { userId?: string; clinicId?: string }
): Promise<DailyUsageSummary[]> {
  logger.info({
    event: 'ai_usage_summary_request',
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    userId: options?.userId,
    clinicId: options?.clinicId,
  });

  // Build where clause
  const where: {
    createdAt: { gte: Date; lte: Date };
    userId?: string;
    clinicId?: string;
  } = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (options?.userId) {
    where.userId = options.userId;
  }
  if (options?.clinicId) {
    where.clinicId = options.clinicId;
  }

  // Get all logs in date range
  const logs = await prisma.aIUsageLog.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  });

  // Group by date
  const dailyMap = new Map<string, {
    totalQueries: number;
    totalTokens: number;
    totalCost: number;
    cacheHits: number;
    providerBreakdown: Record<AIProvider, { count: number; cost: number }>;
  }>();

  for (const log of logs) {
    const dateKey = log.createdAt.toISOString().split('T')[0];

    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, {
        totalQueries: 0,
        totalTokens: 0,
        totalCost: 0,
        cacheHits: 0,
        providerBreakdown: {
          gemini: { count: 0, cost: 0 },
          claude: { count: 0, cost: 0 },
          openai: { count: 0, cost: 0 },
          ollama: { count: 0, cost: 0 },
          vllm: { count: 0, cost: 0 },
          together: { count: 0, cost: 0 },
        },
      });
    }

    const day = dailyMap.get(dateKey)!;
    day.totalQueries++;
    day.totalTokens += log.totalTokens;
    day.totalCost += log.estimatedCost;
    if (log.fromCache) day.cacheHits++;

    // Update provider breakdown
    const provider = log.provider as AIProvider;
    if (day.providerBreakdown[provider]) {
      day.providerBreakdown[provider].count++;
      day.providerBreakdown[provider].cost += log.estimatedCost;
    }
  }

  // Convert to array
  const summaries: DailyUsageSummary[] = [];
  for (const [date, data] of dailyMap) {
    summaries.push({
      date,
      totalQueries: data.totalQueries,
      totalTokens: data.totalTokens,
      totalCost: data.totalCost,
      cacheHitRate: data.totalQueries > 0 ? data.cacheHits / data.totalQueries : 0,
      providerBreakdown: data.providerBreakdown,
    });
  }

  return summaries;
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
  todayUsage: number;
}> {
  // Quota limits per tier (queries per day)
  const quotas: Record<typeof tier, number> = {
    FREE: 10,
    STARTER: 50,
    PRO: 999999, // Unlimited
    ENTERPRISE: 999999, // Unlimited
  };

  const limit = quotas[tier];

  // Get start of today (UTC)
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  // Query database for today's usage
  const todayUsage = await prisma.aIUsageLog.count({
    where: {
      userId,
      createdAt: {
        gte: todayStart,
      },
    },
  });

  const remaining = Math.max(0, limit - todayUsage);
  const allowed = remaining > 0;

  // Reset at midnight UTC
  const resetDate = new Date(todayStart);
  resetDate.setUTCDate(resetDate.getUTCDate() + 1);

  // Log quota check for monitoring
  if (!allowed) {
    logger.warn({
      event: 'ai_quota_exceeded',
      userId,
      tier,
      todayUsage,
      limit,
    });
  }

  return {
    allowed,
    remaining,
    limit,
    resetDate,
    todayUsage,
  };
}

/**
 * Cost monitoring alerts
 * Used for CFO dashboard and budget enforcement
 */
export async function checkCostAlerts(
  clinicId: string,
  monthlyBudget: number = 100.00 // Default $100/month
): Promise<{
  isOverBudget: boolean;
  isApproachingBudget: boolean;
  currentSpend: number;
  monthlyBudget: number;
  percentUsed: number;
  projectedMonthlySpend: number;
}> {
  // Get start of current month
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  // Get current day of month and days remaining
  const now = new Date();
  const currentDay = now.getUTCDate();
  const daysInMonth = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0).getUTCDate();
  const daysRemaining = daysInMonth - currentDay;

  // Query database for this month's total spend
  const result = await prisma.aIUsageLog.aggregate({
    where: {
      clinicId,
      createdAt: {
        gte: monthStart,
      },
    },
    _sum: {
      estimatedCost: true,
    },
  });

  const currentSpend = result._sum.estimatedCost || 0;
  const percentUsed = monthlyBudget > 0 ? (currentSpend / monthlyBudget) * 100 : 0;
  const isOverBudget = currentSpend > monthlyBudget;
  const isApproachingBudget = percentUsed >= 80 && !isOverBudget;

  // Project monthly spend based on current rate
  const dailyRate = currentDay > 0 ? currentSpend / currentDay : 0;
  const projectedMonthlySpend = currentSpend + (dailyRate * daysRemaining);

  // Log alerts for monitoring
  if (isOverBudget) {
    logger.error({
      event: 'ai_budget_exceeded',
      clinicId,
      currentSpend,
      monthlyBudget,
      percentUsed,
    });
  } else if (isApproachingBudget) {
    logger.warn({
      event: 'ai_budget_approaching',
      clinicId,
      currentSpend,
      monthlyBudget,
      percentUsed,
    });
  }

  return {
    isOverBudget,
    isApproachingBudget,
    currentSpend,
    monthlyBudget,
    percentUsed,
    projectedMonthlySpend,
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
