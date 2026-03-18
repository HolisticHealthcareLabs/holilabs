/**
 * Agent Capabilities Discovery API
 *
 * GET /api/agent/capabilities
 *
 * Returns a natural-language manifest of every tool the agent can use.
 * Designed to be injected verbatim into a system prompt so the agent
 * knows what it can do without relying on external documentation.
 *
 * Format: JSON with both machine-readable schema and a human-readable
 * summary string suitable for prompt injection.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { getAllRegisteredTools, getToolsByCategory } from '@/lib/mcp';

export const dynamic = 'force-dynamic';

function buildCapabilitiesNarrative(tools: ReturnType<typeof getAllRegisteredTools>): string {
    const byCategory: Record<string, string[]> = {};

    for (const tool of tools) {
        if (!byCategory[tool.category]) byCategory[tool.category] = [];
        byCategory[tool.category].push(`- ${tool.name}: ${tool.description}`);
    }

    const sections = Object.entries(byCategory)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([category, items]) => {
            const header = category.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
            return `## ${header}\n${items.join('\n')}`;
        });

    return [
        '# Available Agent Tools',
        '',
        'You have access to the following tools. Call them by name with the required parameters.',
        '',
        ...sections,
    ].join('\n');
}

export const GET = createProtectedRoute(
    async (_request: NextRequest) => {
        const tools = getAllRegisteredTools();

        const categories = [...new Set(tools.map((t) => t.category))].sort();

        const toolManifest = tools.map((t) => ({
            name: t.name,
            description: t.description,
            category: t.category,
            requiredPermissions: t.requiredPermissions,
        }));

        const narrative = buildCapabilitiesNarrative(tools);

        return NextResponse.json({
            success: true,
            count: tools.length,
            categories,
            tools: toolManifest,
            // Inject this string directly into a system prompt
            systemPromptFragment: narrative,
            meta: {
                version: '1.0.0',
                generatedAt: new Date().toISOString(),
            },
        });
    },
    { roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'], skipCsrf: true }
);
