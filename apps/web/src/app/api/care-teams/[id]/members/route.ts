import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const AddMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum([
    'LEAD',
    'SPECIALIST',
    'NURSE',
    'COORDINATOR',
    'PHARMACIST',
    'SOCIAL_WORKER',
    'EXTERNAL_CONSULTANT',
  ]),
  specialty: z.string().optional(),
  organizationId: z.string().min(1),
  isExternal: z.boolean().default(false),
});

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const careTeamId = context.params?.id;
      if (!careTeamId) {
        return NextResponse.json({ error: 'Missing care team ID' }, { status: 400 });
      }

      const body = await request.json();
      const parsed = AddMemberSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation error', details: parsed.error.flatten() },
          { status: 422 },
        );
      }

      const careTeam = await prisma.careTeam.findUnique({
        where: { id: careTeamId },
        select: { id: true, owningOrgId: true, status: true },
      });

      if (!careTeam) {
        return NextResponse.json({ error: 'Care team not found' }, { status: 404 });
      }

      if (careTeam.status !== 'ACTIVE') {
        return NextResponse.json(
          { error: `Cannot add members to a ${careTeam.status} care team` },
          { status: 409 },
        );
      }

      // AWAITING_REVIEW: should non-owning-org users be able to add members?
      if (careTeam.owningOrgId !== context.user.organizationId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      const existingMembership = await prisma.careTeamMembership.findUnique({
        where: {
          careTeamId_userId: {
            careTeamId,
            userId: parsed.data.userId,
          },
        },
      });

      if (existingMembership) {
        if (existingMembership.isActive) {
          return NextResponse.json(
            { error: 'User is already an active member of this care team' },
            { status: 409 },
          );
        }

        const reactivated = await prisma.careTeamMembership.update({
          where: { id: existingMembership.id },
          data: {
            isActive: true,
            role: parsed.data.role,
            specialty: parsed.data.specialty,
            organizationId: parsed.data.organizationId,
            isExternal: parsed.data.isExternal,
            leftAt: null,
            leftReason: null,
          },
        });

        return NextResponse.json({ data: reactivated }, { status: 200 });
      }

      const membership = await prisma.careTeamMembership.create({
        data: {
          careTeamId,
          userId: parsed.data.userId,
          role: parsed.data.role,
          specialty: parsed.data.specialty,
          organizationId: parsed.data.organizationId,
          isExternal: parsed.data.isExternal,
        },
      });

      return NextResponse.json({ data: membership }, { status: 201 });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to add member' });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as any,
    audit: { action: 'CREATE', resource: 'CareTeamMembership' },
  },
);
