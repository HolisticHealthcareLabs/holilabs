/**
 * Single Skill Configuration
 *
 * PATCH /api/clinical-skills/config/:skillSlug — Update one skill config
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute, type ApiContext } from '@/lib/api/middleware';
import { upsertClinicianSkillConfig } from '@/lib/ai/skill-config.service';

export const dynamic = 'force-dynamic';

export const PATCH = createProtectedRoute(
    async (
        request: NextRequest,
        context: ApiContext & { params: Promise<{ skillSlug: string }> },
    ) => {
        const { skillSlug } = await context.params;
        const userId = context.user!.id;
        const body = await request.json();

        const ipAddress = request.headers.get('x-forwarded-for')
            ?? request.headers.get('x-real-ip')
            ?? '0.0.0.0';
        const userAgent = request.headers.get('user-agent') ?? undefined;

        try {
            const result = await upsertClinicianSkillConfig(
                userId,
                skillSlug,
                {
                    enabled: body.enabled,
                    priority: body.priority,
                    treatmentApproach: body.treatmentApproach,
                    customInstructions: body.customInstructions,
                    subOptions: body.subOptions,
                },
                { ipAddress, userAgent },
            );

            return NextResponse.json({
                success: true,
                config: {
                    id: result.id,
                    skillSlug,
                    enabled: result.enabled,
                    priority: result.priority,
                    treatmentApproach: result.treatmentApproach,
                    updatedAt: result.updatedAt,
                },
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update skill config';
            return NextResponse.json({ success: false, error: message }, { status: 400 });
        }
    },
    { roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] },
);
