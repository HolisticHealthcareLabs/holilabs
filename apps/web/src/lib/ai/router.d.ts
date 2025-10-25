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
import { type ChatRequest, type ChatResponse, type AIProvider } from './chat';
export type QueryComplexity = 'simple' | 'moderate' | 'complex' | 'critical';
export interface RouterConfig {
    primaryProvider: AIProvider;
    fallbackProviders: AIProvider[];
    preferCheapest: boolean;
    maxCostPerQuery: number;
    minAccuracyThreshold: number;
    complexityThresholds: {
        simple: AIProvider;
        moderate: AIProvider;
        complex: AIProvider;
        critical: AIProvider;
    };
}
/**
 * Smart router for AI requests
 */
export declare function routeAIRequest(request: ChatRequest, config?: Partial<RouterConfig>): Promise<ChatResponse & {
    provider: AIProvider;
}>;
/**
 * Quick helpers for specific use cases
 */
export declare const AIRouter: {
    /**
     * For general clinical questions (uses Gemini Flash)
     */
    general: (messages: ChatRequest["messages"]) => Promise<ChatResponse & {
        provider: AIProvider;
    }>;
    /**
     * For differential diagnosis (uses Claude for accuracy)
     */
    differential: (messages: ChatRequest["messages"]) => Promise<ChatResponse & {
        provider: AIProvider;
    }>;
    /**
     * For drug interactions (uses Claude for safety)
     */
    drugInteractions: (messages: ChatRequest["messages"]) => Promise<ChatResponse & {
        provider: AIProvider;
    }>;
    /**
     * For treatment protocols (uses Gemini for cost-efficiency)
     */
    treatment: (messages: ChatRequest["messages"]) => Promise<ChatResponse & {
        provider: AIProvider;
    }>;
    /**
     * Auto-route based on complexity analysis
     */
    auto: (messages: ChatRequest["messages"]) => Promise<ChatResponse & {
        provider: AIProvider;
    }>;
};
//# sourceMappingURL=router.d.ts.map