/**
 * Clinical Skill Definitions
 *
 * GET /api/clinical-skills/definitions — List all skill definitions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute, type ApiContext } from '@/lib/api/middleware';
import { getSkillDefinitions } from '@/lib/ai/skill-config.service';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
    async (_request: NextRequest, context: ApiContext) => {
        const workspaceId = context.user?.organizationId ?? undefined;
        const definitions = await getSkillDefinitions(workspaceId);

        return NextResponse.json({
            success: true,
            count: definitions.length,
            definitions: definitions.map((d) => ({
                id: d.id,
                slug: d.slug,
                name: d.name,
                namePtBr: d.namePtBr,
                nameEn: d.nameEn,
                description: d.description,
                icon: d.icon,
                color: d.color,
                category: d.category,
                sortOrder: d.sortOrder,
                supportsTreatmentApproach: d.supportsTreatmentApproach,
                toolCategories: d.toolCategories,
                defaultSubOptions: d.defaultSubOptions,
                version: d.version,
                isBuiltIn: d.isBuiltIn,
                isWorkspaceOverride: !!d.workspaceId,
            })),
        });
    },
    { roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'], skipCsrf: true },
);
