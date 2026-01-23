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
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

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
 * Track AI usage - persists to database
 */
export async function trackUsage(
  metrics: Omit<UsageMetrics, 'estimatedCost' | 'timestamp'> & { promptPreview?: string }
): Promise<string | null> {
  try {
    // Calculate cost
    const estimatedCost = calculateCost(
      metrics.provider,
      metrics.promptTokens,
      metrics.completionTokens
    );

    // Persist to database
    const record = await prisma.aIUsageLog.create({
      data: {
        provider: metrics.provider,
        userId: metrics.userId || null,
        clinicId: metrics.clinicId || null,
        promptTokens: metrics.promptTokens,
        completionTokens: metrics.completionTokens,
        totalTokens: metrics.totalTokens,
        estimatedCost,
        responseTimeMs: metrics.responseTimeMs,
        fromCache: metrics.fromCache,
        queryComplexity: metrics.queryComplexity || null,
        feature: metrics.feature || null,
        promptPreview: metrics.promptPreview || null,
      },
    });

    logger.info({
      event: 'ai_usage_tracked',
      provider: metrics.provider,
      totalTokens: metrics.totalTokens,
      estimatedCost,
      fromCache: metrics.fromCache,
      responseTimeMs: metrics.responseTimeMs,
      userId: metrics.userId,
      recordId: record.id,
    });

    return record.id;
  } catch (error) {
    logger.error({
      event: 'ai_usage_tracking_failed',
      error: error instanceof Error ? error.message : String(error),
      provider: metrics.provider,
    });
    return null;
  }
}

/**
 * Wrapper function to track usage from ChatResponse
 * Returns the usage log record ID for quality grading
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
    promptPreview?: string;
  }
): Promise<string | null> {
  if (!response.usage) {
    logger.warn({ event: 'ai_usage_no_data', message: 'No usage data in response' });
    return null;
  }

  return trackUsage({
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
    promptPreview: options.promptPreview,
  });
}

/**
 * Get usage summary for a time period
 */
export async function getUsageSummary(
  startDate: Date,
  endDate: Date,
  options?: { userId?: string; clinicId?: string }
): Promise<DailyUsageSummary[]> {
  const whereClause: Record<string, unknown> = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (options?.userId) {
    whereClause.userId = options.userId;
  }

  if (options?.clinicId) {
    whereClause.clinicId = options.clinicId;
  }

  // Fetch raw data grouped by date
  const logs = await prisma.aIUsageLog.findMany({
    where: whereClause,
    orderBy: { createdAt: 'asc' },
  });

  // Aggregate by date
  const dailyMap = new Map<string, DailyUsageSummary>();

  for (const log of logs) {
    const dateKey = log.createdAt.toISOString().split('T')[0];

    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, {
        date: dateKey,
        totalQueries: 0,
        totalTokens: 0,
        totalCost: 0,
        cacheHitRate: 0,
        providerBreakdown: {
          gemini: { count: 0, cost: 0 },
          claude: { count: 0, cost: 0 },
          openai: { count: 0, cost: 0 },
        },
      });
    }

    const summary = dailyMap.get(dateKey)!;
    summary.totalQueries++;
    summary.totalTokens += log.totalTokens;
    summary.totalCost += log.estimatedCost;

    const provider = log.provider as AIProvider;
    if (summary.providerBreakdown[provider]) {
      summary.providerBreakdown[provider].count++;
      summary.providerBreakdown[provider].cost += log.estimatedCost;
    }
  }

  // Calculate cache hit rates
  for (const [dateKey, summary] of dailyMap) {
    const dayLogs = logs.filter(
      l => l.createdAt.toISOString().split('T')[0] === dateKey
    );
    const cacheHits = dayLogs.filter(l => l.fromCache).length;
    summary.cacheHitRate = dayLogs.length > 0 ? cacheHits / dayLogs.length : 0;
  }

  return Array.from(dailyMap.values());
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

  // Query database for today's usage
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

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
  clinicId: string,
  monthlyBudget: number = 100.00 // $100/month default
): Promise<{
  isOverBudget: boolean;
  currentSpend: number;
  monthlyBudget: number;
  percentUsed: number;
}> {
  // Query database for current month's spend
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

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
  const percentUsed = (currentSpend / monthlyBudget) * 100;
  const isOverBudget = currentSpend > monthlyBudget;

  if (isOverBudget) {
    logger.warn({
      event: 'clinic_over_budget',
      clinicId,
      currentSpend,
      monthlyBudget,
      percentUsed,
    });
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

// ============================================================================
// QUALITY GRADING INTEGRATION
// ============================================================================

export interface QualityGradingInput {
  qualityScore: number; // 0-100
  gradingNotes: {
    hallucinations: string[];
    criticalIssues: string[];
    recommendation: 'pass' | 'review_required' | 'fail';
  };
  gradedBy: string; // "gemini-flash", "human", etc.
}

/**
 * Update a usage record with quality grading results
 * Called by the LLM-as-a-Judge async job
 */
export async function updateQualityGrading(
  usageLogId: string,
  grading: QualityGradingInput
): Promise<boolean> {
  try {
    await prisma.aIUsageLog.update({
      where: { id: usageLogId },
      data: {
        qualityScore: grading.qualityScore,
        gradingNotes: grading.gradingNotes,
        gradedAt: new Date(),
        gradedBy: grading.gradedBy,
      },
    });

    logger.info({
      event: 'quality_grading_updated',
      usageLogId,
      qualityScore: grading.qualityScore,
      recommendation: grading.gradingNotes.recommendation,
      gradedBy: grading.gradedBy,
    });

    return true;
  } catch (error) {
    logger.error({
      event: 'quality_grading_update_failed',
      usageLogId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Get a usage record by ID (for quality grading jobs)
 */
export async function getUsageRecord(usageLogId: string) {
  return prisma.aIUsageLog.findUnique({
    where: { id: usageLogId },
  });
}

/**
 * Get records pending quality grading
 */
export async function getPendingGradingRecords(limit: number = 100) {
  return prisma.aIUsageLog.findMany({
    where: {
      qualityScore: null,
      fromCache: false, // Only grade non-cached responses
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Get quality metrics summary
 */
export async function getQualityMetrics(
  startDate: Date,
  endDate: Date,
  options?: { clinicId?: string }
): Promise<{
  averageScore: number;
  passRate: number;
  reviewRate: number;
  failRate: number;
  totalGraded: number;
}> {
  const whereClause: Record<string, unknown> = {
    gradedAt: {
      gte: startDate,
      lte: endDate,
    },
    qualityScore: { not: null },
  };

  if (options?.clinicId) {
    whereClause.clinicId = options.clinicId;
  }

  const records = await prisma.aIUsageLog.findMany({
    where: whereClause,
    select: {
      qualityScore: true,
      gradingNotes: true,
    },
  });

  if (records.length === 0) {
    return {
      averageScore: 0,
      passRate: 0,
      reviewRate: 0,
      failRate: 0,
      totalGraded: 0,
    };
  }

  const scores = records.map(r => r.qualityScore!);
  const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  let passCount = 0;
  let reviewCount = 0;
  let failCount = 0;

  for (const record of records) {
    const notes = record.gradingNotes as { recommendation?: string } | null;
    if (notes?.recommendation === 'pass') passCount++;
    else if (notes?.recommendation === 'review_required') reviewCount++;
    else if (notes?.recommendation === 'fail') failCount++;
  }

  return {
    averageScore,
    passRate: passCount / records.length,
    reviewRate: reviewCount / records.length,
    failRate: failCount / records.length,
    totalGraded: records.length,
  };
}
