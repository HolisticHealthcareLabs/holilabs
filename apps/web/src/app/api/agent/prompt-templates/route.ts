/**
 * Agent Prompt Templates API
 *
 * GET  /api/agent/prompt-templates — List all templates (global + workspace overrides)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute, type ApiContext } from '@/lib/api/middleware';
import { listTemplates } from '@/lib/ai/prompt-templates';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
    async (_request: NextRequest, context: ApiContext) => {
        const workspaceId = context.user?.organizationId ?? undefined;
        const templates = await listTemplates(workspaceId);

        return NextResponse.json({
            success: true,
            count: templates.length,
            templates: templates.map((t) => ({
                id: t.id,
                slug: t.slug,
                name: t.name,
                description: t.description,
                category: t.category,
                version: t.version,
                isDefault: t.isDefault,
                customizable: t.customizable,
                isWorkspaceOverride: !!t.workspaceId,
                updatedAt: t.updatedAt,
            })),
        });
    },
    { roles: ['ADMIN'], skipCsrf: true },
);
