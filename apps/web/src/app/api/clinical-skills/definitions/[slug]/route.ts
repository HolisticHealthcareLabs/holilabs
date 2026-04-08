/**
 * Clinical Skill Definition by Slug
 *
 * GET /api/clinical-skills/definitions/:slug — Resolve definition
 * PUT /api/clinical-skills/definitions/:slug — Workspace admin override
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute, type ApiContext } from '@/lib/api/middleware';
import { resolveSkillDefinition } from '@/lib/ai/skill-config.service';
import { prisma } from '@/lib/prisma';
import { builtinSkillMap } from '@/lib/ai/clinical-skills';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
    async (
        _request: NextRequest,
        context: ApiContext & { params: Promise<{ slug: string }> },
    ) => {
        const { slug } = await context.params;
        const workspaceId = context.user?.organizationId ?? undefined;
        const definition = await resolveSkillDefinition(slug, workspaceId);

        if (!definition) {
            return NextResponse.json(
                { success: false, error: `Skill "${slug}" not found` },
                { status: 404 },
            );
        }

        return NextResponse.json({
            success: true,
            definition: {
                id: definition.id,
                slug: definition.slug,
                name: definition.name,
                namePtBr: definition.namePtBr,
                nameEn: definition.nameEn,
                description: definition.description,
                icon: definition.icon,
                color: definition.color,
                category: definition.category,
                sortOrder: definition.sortOrder,
                supportsTreatmentApproach: definition.supportsTreatmentApproach,
                skillPromptSuffix: definition.skillPromptSuffix,
                toolCategories: definition.toolCategories,
                defaultSubOptions: definition.defaultSubOptions,
                version: definition.version,
                isBuiltIn: definition.isBuiltIn,
            },
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
                { success: false, error: 'Workspace context required' },
                { status: 400 },
            );
        }

        // Verify the slug exists as a builtin or global definition
        const builtin = builtinSkillMap.get(slug);
        const globalDef = await prisma.clinicalSkillDefinition.findFirst({
            where: { slug, workspaceId: null, isActive: true },
        });

        if (!builtin && !globalDef) {
            return NextResponse.json(
                { success: false, error: `No base skill "${slug}" exists to override` },
                { status: 404 },
            );
        }

        const body = await request.json();

        const result = await prisma.clinicalSkillDefinition.upsert({
            where: { slug_workspaceId: { slug, workspaceId } },
            update: {
                ...(body.name && { name: body.name }),
                ...(body.description && { description: body.description }),
                ...(body.skillPromptSuffix && { skillPromptSuffix: body.skillPromptSuffix }),
                updatedAt: new Date(),
            },
            create: {
                slug,
                name: body.name ?? globalDef?.name ?? builtin?.name ?? slug,
                description: body.description ?? globalDef?.description ?? builtin?.description,
                icon: globalDef?.icon ?? builtin?.icon ?? '\u{2699}',
                color: globalDef?.color ?? builtin?.color ?? '#6B7280',
                category: globalDef?.category ?? builtin?.category ?? 'WORKFLOW',
                sortOrder: globalDef?.sortOrder ?? builtin?.sortOrder ?? 99,
                supportsTreatmentApproach: globalDef?.supportsTreatmentApproach ?? builtin?.supportsTreatmentApproach ?? false,
                skillPromptSuffix: body.skillPromptSuffix ?? globalDef?.skillPromptSuffix ?? builtin?.skillPromptSuffix ?? '',
                toolCategories: globalDef?.toolCategories ?? builtin?.toolCategories ?? [],
                workspaceId,
                createdById: context.user!.id,
                isBuiltIn: false,
                version: '1.0.0',
            },
        });

        return NextResponse.json({
            success: true,
            definition: {
                id: result.id,
                slug: result.slug,
                name: result.name,
                version: result.version,
                updatedAt: result.updatedAt,
            },
        });
    },
    { roles: ['ADMIN'] },
);
