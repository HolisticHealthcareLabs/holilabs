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
    provider: AIProvider;
    userId?: string;
    clinicId?: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
    responseTimeMs: number;
    fromCache: boolean;
    queryComplexity?: 'simple' | 'moderate' | 'complex' | 'critical';
    feature?: string;
    timestamp: Date;
}
export interface DailyUsageSummary {
    date: string;
    totalQueries: number;
    totalTokens: number;
    totalCost: number;
    cacheHitRate: number;
    providerBreakdown: {
        gemini: {
            count: number;
            cost: number;
        };
        claude: {
            count: number;
            cost: number;
        };
        openai: {
            count: number;
            cost: number;
        };
    };
}
/**
 * Calculate estimated cost based on token usage
 */
export declare function calculateCost(provider: AIProvider, promptTokens: number, completionTokens: number): number;
/**
 * Track AI usage
 */
export declare function trackUsage(metrics: Omit<UsageMetrics, 'estimatedCost' | 'timestamp'>): Promise<void>;
/**
 * Wrapper function to track usage from ChatResponse
 */
export declare function trackFromResponse(response: ChatResponse & {
    provider?: AIProvider;
}, options: {
    userId?: string;
    clinicId?: string;
    responseTimeMs: number;
    fromCache?: boolean;
    queryComplexity?: UsageMetrics['queryComplexity'];
    feature?: string;
}): Promise<void>;
/**
 * Get usage summary for a time period (mocked for now)
 * TODO: Implement with real database queries
 */
export declare function getUsageSummary(startDate: Date, endDate: Date, options?: {
    userId?: string;
    clinicId?: string;
}): Promise<DailyUsageSummary[]>;
/**
 * Check if user has exceeded their quota
 * Used for freemium tier enforcement
 */
export declare function checkUserQuota(userId: string, tier: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE'): Promise<{
    allowed: boolean;
    remaining: number;
    limit: number;
    resetDate: Date;
}>;
/**
 * Cost monitoring alerts
 */
export declare function checkCostAlerts(clinicId: string): Promise<{
    isOverBudget: boolean;
    currentSpend: number;
    monthlyBudget: number;
    percentUsed: number;
}>;
/**
 * Export cost comparison between providers
 */
export declare function compareProviderCosts(tokenCount?: number): {
    provider: AIProvider;
    costPer10kTokens: number;
    costSavingsVsClaude: string;
}[];
/**
 * Pretty print cost comparison
 */
export declare function printCostComparison(): void;
//# sourceMappingURL=usage-tracker.d.ts.map