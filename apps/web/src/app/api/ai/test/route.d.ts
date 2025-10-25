/**
 * AI Infrastructure Test Endpoint
 *
 * Test the complete AI stack:
 * - Gemini Flash integration
 * - Redis caching
 * - Smart routing
 * - Usage tracking
 *
 * Usage: GET /api/ai/test
 */
import { NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
export declare function GET(): Promise<NextResponse<{
    success: boolean;
    timestamp: string;
    totalTestTime: string;
    cache: {
        isHealthy: any;
        isConfigured: any;
        totalKeys: any;
        estimatedSize: any;
        error: any;
    };
    simpleQuery: {
        success: any;
        provider: any;
        messagePreview: string | null;
        tokens: any;
        responseTime: string;
        fromCache: boolean;
        error: any;
    };
    complexQuery: {
        success: any;
        provider: any;
        messagePreview: string | null;
        tokens: any;
        fromCache: boolean;
        error: any;
    };
    costAnalysis: {
        perQuery: {
            gemini: string;
            claude: string;
            openai: string;
        };
        monthlyCost100Users: {
            geminiOnly: string;
            geminiWithCache: string;
            claudeOnly: string;
        };
        savings: {
            vsClaudeOnly: string;
            withCaching: string;
        };
        providers: any;
    };
    environment: {
        geminiConfigured: boolean;
        claudeConfigured: boolean;
        openaiConfigured: boolean;
        redisConfigured: boolean;
        primaryProvider: string;
        cacheEnabled: boolean;
        cacheTTL: string;
    };
    recommendations: string[];
    nextSteps: string[];
}> | NextResponse<{
    success: boolean;
    error: any;
    stack: any;
    timestamp: string;
}>>;
//# sourceMappingURL=route.d.ts.map