/**
 * Clinician Skill Configuration
 *
 * GET   /api/clinical-skills/config — Get all configs for authenticated clinician
 * PATCH /api/clinical-skills/config — Bulk update configs
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute, type ApiContext } from '@/lib/api/middleware';
import {
    getClinicianSkillConfigs,
    bulkUpdateClinicianSkillConfigs,
} from '@/lib/ai/skill-config.service';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
    async (_request: NextRequest, context: ApiContext) => {
        const userId = context.user!.id;
        const workspaceId = context.user?.organizationId ?? undefined;
        const configs = await getClinicianSkillConfigs(userId, workspaceId);

        return NextResponse.json({
            success: true,
            count: configs.length,
            configs,
        });
    },
    { roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'], skipCsrf: true },
);

export const PATCH = createProtectedRoute(
    async (request: NextRequest, context: ApiContext) => {
        const userId = context.user!.id;
        const body = await request.json();
        const { configs } = body;

        if (!Array.isArray(configs) || configs.length === 0) {
            return NextResponse.json(
                { success: false, error: 'configs must be a non-empty array' },
                { status: 400 },
            );
        }

        if (configs.length > 20) {
            return NextResponse.json(
                { success: false, error: 'Maximum 20 configs per request' },
                { status: 400 },
            );
        }

        const ipAddress = request.headers.get('x-forwarded-for')
            ?? request.headers.get('x-real-ip')
            ?? '0.0.0.0';
        const userAgent = request.headers.get('user-agent') ?? undefined;

        const results = await bulkUpdateClinicianSkillConfigs(
            userId,
            configs,
            { ipAddress, userAgent },
        );

        return NextResponse.json({
            success: true,
            updated: results.length,
        });
    },
    { roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] },
);
