/**
 * Agent Prompt Template by Slug
 *
 * GET    /api/agent/prompt-templates/:slug — Resolve template (workspace → global → builtin)
 * PUT    /api/agent/prompt-templates/:slug — Create/update workspace override
 * DELETE /api/agent/prompt-templates/:slug — Remove workspace override (revert to default)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute, type ApiContext } from '@/lib/api/middleware';
import {
    resolvePromptTemplate,
    upsertWorkspaceOverride,
    deleteWorkspaceOverride,
} from '@/lib/ai/prompt-templates';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
    async (
        _request: NextRequest,
        context: ApiContext & { params: Promise<{ slug: string }> },
    ) => {
        const { slug } = await context.params;
        const workspaceId = context.user?.organizationId ?? undefined;

        const result = await resolvePromptTemplate(slug, workspaceId);

        return NextResponse.json({
            success: true,
            slug,
            source: result.source,
            prompt: result.prompt,
            template: result.template
                ? {
                    id: result.template.id,
                    name: result.template.name,
                    version: result.template.version,
                    category: result.template.category,
                    customizable: result.template.customizable,
                    isDefault: result.template.isDefault,
                    updatedAt: result.template.updatedAt,
                }
                : null,
        });
    },
    { roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'], skipCsrf: true },
);

export const PUT = createProtectedRoute(
    async (
        request: NextRequest,
        context: ApiContext & { params: Promise<{ slug: string }> },
    ) => {
        const { slug } = await context.params;
        const workspaceId = context.user?.organizationId;

        if (!workspaceId) {
            return NextResponse.json(
                { success: false, error: 'Workspace context required to create overrides' },
                { status: 400 },
            );
        }

        const body = await request.json();
        const { prompt } = body;

        if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 20) {
            return NextResponse.json(
                { success: false, error: 'Prompt must be at least 20 characters' },
                { status: 400 },
            );
        }

        try {
            const template = await upsertWorkspaceOverride(
                slug,
                workspaceId,
                prompt.trim(),
                context.user!.id,
            );

            return NextResponse.json({
                success: true,
                template: {
                    id: template.id,
                    slug: template.slug,
                    name: template.name,
                    version: template.version,
                    isDefault: template.isDefault,
                    updatedAt: template.updatedAt,
                },
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update template';
            return NextResponse.json({ success: false, error: message }, { status: 400 });
        }
    },
    { roles: ['ADMIN'] },
);

export const DELETE = createProtectedRoute(
    async (
        _request: NextRequest,
        context: ApiContext & { params: Promise<{ slug: string }> },
    ) => {
        const { slug } = await context.params;
        const workspaceId = context.user?.organizationId;

        if (!workspaceId) {
            return NextResponse.json(
                { success: false, error: 'Workspace context required' },
                { status: 400 },
            );
        }

        await deleteWorkspaceOverride(slug, workspaceId);

        return NextResponse.json({
            success: true,
            message: `Workspace override for "${slug}" removed. Global default restored.`,
        });
    },
    { roles: ['ADMIN'] },
);
