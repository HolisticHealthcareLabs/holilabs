import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (_request: NextRequest, context: any) => {
    try {
      const careTeamId = context.params?.id;
      if (!careTeamId) {
        return NextResponse.json({ error: 'Missing care team ID' }, { status: 400 });
      }

      const careTeam = await prisma.careTeam.findUnique({
        where: { id: careTeamId },
        include: {
          members: true,
          tasks: { orderBy: { createdAt: 'desc' }, take: 50 },
          conferences: { orderBy: { scheduledAt: 'desc' }, take: 10 },
          sharedCarePlans: true,
          goals: true,
        },
      });

      if (!careTeam) {
        return NextResponse.json({ error: 'Care team not found' }, { status: 404 });
      }

      // AWAITING_REVIEW: cross-org visibility — should external members see full detail?
      if (careTeam.owningOrgId !== context.user.organizationId) {
        const isMember = careTeam.members.some(
          (m) => m.userId === context.user.id && m.isActive,
        );
        if (!isMember) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      }

      return NextResponse.json({ data: careTeam });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to fetch care team' });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as any,
    audit: { action: 'READ', resource: 'CareTeam' },
  },
);

const UpdateCareTeamSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['ACTIVE', 'DISSOLVED', 'ON_HOLD']).optional(),
});

export const PATCH = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const careTeamId = context.params?.id;
      if (!careTeamId) {
        return NextResponse.json({ error: 'Missing care team ID' }, { status: 400 });
      }

      const body = await request.json();
      const parsed = UpdateCareTeamSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation error', details: parsed.error.flatten() },
          { status: 422 },
        );
      }

      const existing = await prisma.careTeam.findUnique({
        where: { id: careTeamId },
        select: { id: true, owningOrgId: true },
      });

      if (!existing) {
        return NextResponse.json({ error: 'Care team not found' }, { status: 404 });
      }

      if (existing.owningOrgId !== context.user.organizationId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      const data: any = { ...parsed.data };
      if (data.status === 'DISSOLVED') {
        data.dissolvedAt = new Date();
      }

      const updated = await prisma.careTeam.update({
        where: { id: careTeamId },
        data,
        include: { members: true },
      });

      return NextResponse.json({ data: updated });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to update care team' });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as any,
    audit: { action: 'UPDATE', resource: 'CareTeam' },
  },
);
