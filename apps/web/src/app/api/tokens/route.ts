/**
 * TokenMap API - Transparent token usage tracking for agents
 * 
 * This API exposes a public TokenMap that agents can use to:
 * - Understand token costs before making API calls
 * - Track cumulative token usage per session
 * - Optimize prompts based on token budgets
 * 
 * Per Anthropic's Agent-Native design principles:
 * "Surface a public 'TokenMap' so agents can estimate costs before calls"
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// =============================================================================
// TOKEN MAP CONFIGURATION
// =============================================================================

interface TokenEstimate {
    inputTokens: number;
    outputTokens: number;
    description: string;
}

interface EndpointTokenMap {
    [endpoint: string]: {
        method: string;
        baseTokens: TokenEstimate;
        perItemTokens?: number; // For paginated/list endpoints
        description: string;
    };
}

// Static token estimates for common endpoints
// These are approximate values based on typical response sizes
const TOKEN_MAP: EndpointTokenMap = {
    // Patient endpoints
    '/api/patients': {
        method: 'GET',
        baseTokens: { inputTokens: 50, outputTokens: 500, description: 'Patient list (paginated)' },
        perItemTokens: 100,
        description: 'List patients with basic info',
    },
    '/api/patients/[id]': {
        method: 'GET',
        baseTokens: { inputTokens: 50, outputTokens: 2000, description: 'Full patient record' },
        description: 'Complete patient with conditions, meds, allergies',
    },
    '/api/patients/[id]/context': {
        method: 'GET',
        baseTokens: { inputTokens: 50, outputTokens: 3000, description: 'Clinical context' },
        description: 'Full clinical context for AI consumption',
    },

    // Medication endpoints
    '/api/patients/[id]/medications': {
        method: 'GET',
        baseTokens: { inputTokens: 30, outputTokens: 400, description: 'Medication list' },
        perItemTokens: 80,
        description: 'Patient medications',
    },
    '/api/clinical/drugs': {
        method: 'GET',
        baseTokens: { inputTokens: 50, outputTokens: 600, description: 'Drug lookup' },
        description: 'RxNorm + FDA drug information',
    },
    '/api/clinical/drugs/interactions': {
        method: 'POST',
        baseTokens: { inputTokens: 100, outputTokens: 800, description: 'DDI check' },
        description: 'Drug-drug interaction analysis',
    },

    // Clinical note endpoints
    '/api/ai/generate-note': {
        method: 'POST',
        baseTokens: { inputTokens: 3000, outputTokens: 2000, description: 'Note generation' },
        description: 'AI-assisted clinical note draft',
    },
    '/api/cdss/chat': {
        method: 'POST',
        baseTokens: { inputTokens: 2000, outputTokens: 1500, description: 'CDSS chat' },
        description: 'Clinical decision support conversation',
    },

    // Appointment endpoints
    '/api/appointments': {
        method: 'GET',
        baseTokens: { inputTokens: 30, outputTokens: 300, description: 'Appointment list' },
        perItemTokens: 60,
        description: 'Appointment schedule',
    },

    // Agent tools
    '/api/agent/tools': {
        method: 'GET',
        baseTokens: { inputTokens: 20, outputTokens: 1000, description: 'Tool discovery' },
        description: 'Available MCP tools',
    },

    // Governance
    '/api/governance/check': {
        method: 'POST',
        baseTokens: { inputTokens: 500, outputTokens: 300, description: 'Safety check' },
        description: 'Fast Lane contraindication check',
    },
};

// Live token usage tracking (in production, use Redis/persistent store)
const sessionTokenUsage = new Map<string, {
    totalInputTokens: number;
    totalOutputTokens: number;
    callCount: number;
    lastUpdated: Date;
}>();

// =============================================================================
// GET /api/tokens
// =============================================================================

/**
 * GET /api/tokens
 * 
 * Query params:
 * - endpoint: Get estimate for specific endpoint
 * - sessionId: Get usage for a session
 * - all: Return full token map
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const endpoint = searchParams.get('endpoint');
        const sessionId = searchParams.get('sessionId');
        const all = searchParams.get('all');

        // Get estimate for specific endpoint
        if (endpoint) {
            const mapped = Object.entries(TOKEN_MAP).find(([key]) =>
                endpoint.includes(key.replace(/\[.*?\]/g, ''))
            );

            if (!mapped) {
                return NextResponse.json({
                    success: true,
                    estimate: {
                        endpoint,
                        known: false,
                        defaultEstimate: {
                            inputTokens: 100,
                            outputTokens: 500,
                            description: 'Default estimate for unknown endpoint',
                        },
                    },
                });
            }

            const [key, value] = mapped;
            return NextResponse.json({
                success: true,
                estimate: {
                    endpoint: key,
                    method: value.method,
                    ...value.baseTokens,
                    perItemTokens: value.perItemTokens,
                    description: value.description,
                },
            });
        }

        // Get session usage
        if (sessionId) {
            const usage = sessionTokenUsage.get(sessionId);
            return NextResponse.json({
                success: true,
                session: {
                    sessionId,
                    ...(usage || {
                        totalInputTokens: 0,
                        totalOutputTokens: 0,
                        callCount: 0,
                        lastUpdated: null,
                    }),
                },
            });
        }

        // Return full token map
        if (all) {
            return NextResponse.json({
                success: true,
                tokenMap: TOKEN_MAP,
                meta: {
                    endpointCount: Object.keys(TOKEN_MAP).length,
                    note: 'Token estimates are approximate and may vary based on data size',
                },
            });
        }

        // Default: return summary
        return NextResponse.json({
            success: true,
            summary: {
                endpointsTracked: Object.keys(TOKEN_MAP).length,
                categories: {
                    patient: Object.keys(TOKEN_MAP).filter(k => k.includes('patient')).length,
                    clinical: Object.keys(TOKEN_MAP).filter(k => k.includes('clinical')).length,
                    ai: Object.keys(TOKEN_MAP).filter(k => k.includes('ai') || k.includes('cdss')).length,
                    agent: Object.keys(TOKEN_MAP).filter(k => k.includes('agent')).length,
                },
                mostExpensive: Object.entries(TOKEN_MAP)
                    .sort((a, b) =>
                        (b[1].baseTokens.inputTokens + b[1].baseTokens.outputTokens) -
                        (a[1].baseTokens.inputTokens + a[1].baseTokens.outputTokens)
                    )
                    .slice(0, 5)
                    .map(([endpoint, data]) => ({
                        endpoint,
                        totalTokens: data.baseTokens.inputTokens + data.baseTokens.outputTokens,
                    })),
            },
            endpoints: {
                estimate: 'GET /api/tokens?endpoint=/api/patients/[id]',
                session: 'GET /api/tokens?sessionId=xxx',
                fullMap: 'GET /api/tokens?all=true',
            },
        });
    } catch (error) {
        console.error('TokenMap error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to get token information' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/tokens
 * 
 * Record token usage for a session
 * Body: { sessionId, inputTokens, outputTokens, endpoint }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { sessionId, inputTokens, outputTokens, endpoint } = body;

        if (!sessionId) {
            return NextResponse.json(
                { success: false, error: 'sessionId is required' },
                { status: 400 }
            );
        }

        const existing = sessionTokenUsage.get(sessionId) || {
            totalInputTokens: 0,
            totalOutputTokens: 0,
            callCount: 0,
            lastUpdated: new Date(),
        };

        const updated = {
            totalInputTokens: existing.totalInputTokens + (inputTokens || 0),
            totalOutputTokens: existing.totalOutputTokens + (outputTokens || 0),
            callCount: existing.callCount + 1,
            lastUpdated: new Date(),
        };

        sessionTokenUsage.set(sessionId, updated);

        logger.info({
            event: 'token_usage_recorded',
            sessionId,
            endpoint,
            inputTokens,
            outputTokens,
            cumulative: updated,
        });

        return NextResponse.json({
            success: true,
            session: {
                sessionId,
                ...updated,
            },
            budget: {
                // Example budget tracking
                dailyLimit: 100000,
                used: updated.totalInputTokens + updated.totalOutputTokens,
                remaining: 100000 - (updated.totalInputTokens + updated.totalOutputTokens),
                percentUsed: ((updated.totalInputTokens + updated.totalOutputTokens) / 100000 * 100).toFixed(2),
            },
        });
    } catch (error) {
        console.error('Token record error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to record token usage' },
            { status: 500 }
        );
    }
}
