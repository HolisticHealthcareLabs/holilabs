import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';

export const dynamic = 'force-dynamic';

export const DELETE = createProtectedRoute(
  async (_request: NextRequest, context: any) => {
    try {
      const careTeamId = context.params?.id;
      const userId = context.params?.userId;

      if (!careTeamId || !userId) {
        return NextResponse.json(
          { error: 'Missing care team ID or user ID' },
          { status: 400 },
        );
      }

      const careTeam = await prisma.careTeam.findUnique({
        where: { id: careTeamId },
        select: { id: true, owningOrgId: true },
      });

      if (!careTeam) {
        return NextResponse.json({ error: 'Care team not found' }, { status: 404 });
      }

      if (careTeam.owningOrgId !== context.user.organizationId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      const membership = await prisma.careTeamMembership.findUnique({
        where: {
          careTeamId_userId: { careTeamId, userId },
        },
      });

      if (!membership) {
        return NextResponse.json(
          { error: 'Membership not found' },
          { status: 404 },
        );
      }

      if (!membership.isActive) {
        return NextResponse.json(
          { error: 'Member is already inactive' },
          { status: 409 },
        );
      }

      await prisma.careTeamMembership.update({
        where: { id: membership.id },
        data: {
          isActive: false,
          leftAt: new Date(),
          leftReason: 'Removed by team administrator',
        },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to remove member' });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as any,
    audit: { action: 'DELETE', resource: 'CareTeamMembership' },
  },
);
