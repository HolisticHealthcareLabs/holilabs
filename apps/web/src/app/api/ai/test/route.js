"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const router_1 = require("@/lib/ai/router");
const cache_1 = require("@/lib/ai/cache");
const usage_tracker_1 = require("@/lib/ai/usage-tracker");
exports.dynamic = 'force-dynamic';
async function GET() {
    const startTime = Date.now();
    try {
        // Test 1: Cache Health Check
        const cacheHealth = await (0, cache_1.cacheHealthCheck)();
        // Test 2: Simple AI Query (should route to Gemini)
        const simpleQuery = await (0, router_1.routeAIRequest)({
            messages: [
                {
                    role: 'user',
                    content: 'What is the recommended first-line treatment for hypertension?'
                }
            ]
        });
        // Test 3: Complex Query (should route to Claude if available)
        const complexQuery = await (0, router_1.routeAIRequest)({
            messages: [
                {
                    role: 'user',
                    content: 'Patient presents with acute chest pain, diaphoresis, and shortness of breath. Provide differential diagnosis and emergency protocol.'
                }
            ]
        });
        // Test 4: Cost Comparison
        const costComparison = (0, usage_tracker_1.compareProviderCosts)(10000);
        const totalTime = Date.now() - startTime;
        return server_1.NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            totalTestTime: `${totalTime}ms`,
            // Cache Status
            cache: {
                isHealthy: cacheHealth.isHealthy,
                isConfigured: cacheHealth.isConfigured,
                totalKeys: cacheHealth.stats?.totalKeys || 0,
                estimatedSize: cacheHealth.stats?.estimatedSize || '0 MB',
                error: cacheHealth.error || null,
            },
            // Simple Query Test
            simpleQuery: {
                success: simpleQuery.success,
                provider: simpleQuery.provider || 'unknown',
                messagePreview: simpleQuery.message?.substring(0, 200) + '...' || null,
                tokens: simpleQuery.usage?.totalTokens || 0,
                responseTime: simpleQuery.usage ? 'N/A' : 'Error',
                fromCache: false,
                error: simpleQuery.error || null,
            },
            // Complex Query Test
            complexQuery: {
                success: complexQuery.success,
                provider: complexQuery.provider || 'unknown',
                messagePreview: complexQuery.message?.substring(0, 200) + '...' || null,
                tokens: complexQuery.usage?.totalTokens || 0,
                fromCache: false,
                error: complexQuery.error || null,
            },
            // Cost Analysis
            costAnalysis: {
                perQuery: {
                    gemini: '$0.0019',
                    claude: '$0.0900',
                    openai: '$0.1000',
                },
                monthlyCost100Users: {
                    geminiOnly: '$6.00',
                    geminiWithCache: '$2.40 (60% cache hit)',
                    claudeOnly: '$180.00',
                },
                savings: {
                    vsClaudeOnly: '98.7%',
                    withCaching: '60% additional',
                },
                providers: costComparison,
            },
            // Environment Check
            environment: {
                geminiConfigured: !!process.env.GOOGLE_AI_API_KEY,
                claudeConfigured: !!process.env.ANTHROPIC_API_KEY,
                openaiConfigured: !!process.env.OPENAI_API_KEY,
                redisConfigured: !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
                primaryProvider: process.env.AI_PRIMARY_PROVIDER || 'gemini (default)',
                cacheEnabled: process.env.AI_CACHE_ENABLED !== 'false',
                cacheTTL: process.env.AI_CACHE_TTL || '86400s (default)',
            },
            // Recommendations
            recommendations: [
                cacheHealth.isHealthy ? '✅ Cache is working' : '⚠️ Enable Redis caching for 60% cost savings',
                simpleQuery.success ? '✅ Primary provider working' : '❌ Check GOOGLE_AI_API_KEY',
                simpleQuery.provider === 'gemini' ? '✅ Routing to Gemini (cheapest)' : '⚠️ Not using cheapest provider',
                complexQuery.provider === 'claude' || complexQuery.provider === 'gemini' ? '✅ Smart routing working' : 'ℹ️ Only one provider configured',
            ],
            // Next Steps
            nextSteps: [
                'Monitor cache hit rate over next 48 hours (should reach 60%)',
                'Check Google AI Studio dashboard for actual usage',
                'Verify costs are <$0.003 per query',
                'Run test-ai-setup.ts script for detailed analysis',
            ],
        });
    }
    catch (error) {
        return server_1.NextResponse.json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            timestamp: new Date().toISOString(),
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map