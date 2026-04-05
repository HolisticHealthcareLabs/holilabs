import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const CreateCareTeamSchema = z.object({
  patientId: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  sharingAgreementId: z.string().optional(),
});

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const body = await request.json();
      const parsed = CreateCareTeamSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation error', details: parsed.error.flatten() },
          { status: 422 },
        );
      }

      const { patientId, name, description, sharingAgreementId } = parsed.data;

      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: { id: true },
      });

      if (!patient) {
        return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
      }

      const careTeam = await prisma.careTeam.create({
        data: {
          patientId,
          name,
          description,
          owningOrgId: context.user.organizationId,
          sharingAgreementId,
          createdBy: context.user.id,
          status: 'ACTIVE',
        },
        include: {
          members: true,
        },
      });

      return NextResponse.json({ data: careTeam }, { status: 201 });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to create care team' });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as any,
    audit: { action: 'CREATE', resource: 'CareTeam' },
  },
);

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const { searchParams } = new URL(request.url);
      const patientId = searchParams.get('patientId');
      const status = searchParams.get('status');
      const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
      const skip = (page - 1) * limit;

      const where: any = {
        owningOrgId: context.user.organizationId,
      };

      if (patientId) where.patientId = patientId;
      if (status) where.status = status;

      const [careTeams, total] = await Promise.all([
        prisma.careTeam.findMany({
          where,
          include: {
            members: true,
            _count: { select: { tasks: true, conferences: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.careTeam.count({ where }),
      ]);

      return NextResponse.json({
        data: careTeams,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to list care teams' });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as any,
    audit: { action: 'READ', resource: 'CareTeam' },
  },
);
