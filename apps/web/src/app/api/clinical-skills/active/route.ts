/**
 * Active Skills for Chat
 *
 * GET /api/clinical-skills/active — Lightweight endpoint for the chat UI.
 * Returns only enabled skills with resolved configs, sorted by priority.
 * Also initializes default skills for first-time users based on specialty.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute, type ApiContext } from '@/lib/api/middleware';
import {
    getActiveSkillsForChat,
    initializeSkillsForSpecialty,
} from '@/lib/ai/skill-config.service';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
    async (_request: NextRequest, context: ApiContext) => {
        const userId = context.user!.id;
        const workspaceId = context.user?.organizationId ?? undefined;

        // First-time initialization: seed defaults based on specialty
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { specialty: true },
        });
        await initializeSkillsForSpecialty(userId, user?.specialty, workspaceId);

        const activeSkills = await getActiveSkillsForChat(userId, workspaceId);

        return NextResponse.json({
            success: true,
            count: activeSkills.length,
            skills: activeSkills.map((s) => ({
                slug: s.slug,
                name: s.name,
                icon: s.icon,
                color: s.color,
                category: s.category,
                priority: s.priority,
                treatmentApproach: s.treatmentApproach,
            })),
        });
    },
    { roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'], skipCsrf: true },
);
