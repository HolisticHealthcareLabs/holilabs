import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const CreateSharedCarePlanSchema = z.object({
  careTeamId: z.string().min(1),
  patientId: z.string().min(1),
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  discipline: z.string().min(1).max(100),
  templateId: z.string().optional(),
  interventions: z.any().optional(),
  targetOutcomes: z.any().optional(),
  reviewCycleDays: z.number().int().min(1).max(365).default(30),
});

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const body = await request.json();
      const parsed = CreateSharedCarePlanSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation error', details: parsed.error.flatten() },
          { status: 422 },
        );
      }

      const careTeam = await prisma.careTeam.findUnique({
        where: { id: parsed.data.careTeamId },
        select: { id: true, patientId: true, status: true },
      });

      if (!careTeam) {
        return NextResponse.json({ error: 'Care team not found' }, { status: 404 });
      }

      if (careTeam.status !== 'ACTIVE') {
        return NextResponse.json(
          { error: `Cannot create plan on a ${careTeam.status} care team` },
          { status: 409 },
        );
      }

      if (careTeam.patientId !== parsed.data.patientId) {
        return NextResponse.json(
          { error: 'Patient does not belong to this care team' },
          { status: 400 },
        );
      }

      const plan = await prisma.sharedCarePlan.create({
        data: {
          careTeamId: parsed.data.careTeamId,
          patientId: parsed.data.patientId,
          title: parsed.data.title,
          description: parsed.data.description,
          discipline: parsed.data.discipline,
          templateId: parsed.data.templateId,
          interventions: parsed.data.interventions ?? undefined,
          targetOutcomes: parsed.data.targetOutcomes ?? undefined,
          reviewCycleDays: parsed.data.reviewCycleDays,
          status: 'DRAFT',
          createdByUserId: context.user.id,
          createdByOrgId: context.user.organizationId,
        },
        include: { goals: true },
      });

      return NextResponse.json({ data: plan }, { status: 201 });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to create shared care plan' });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as any,
    audit: { action: 'CREATE', resource: 'SharedCarePlan' },
  },
);

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const { searchParams } = new URL(request.url);
      const patientId = searchParams.get('patientId');
      const careTeamId = searchParams.get('careTeamId');
      const status = searchParams.get('status');
      const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
      const skip = (page - 1) * limit;

      const where: any = {};
      if (patientId) where.patientId = patientId;
      if (careTeamId) where.careTeamId = careTeamId;
      if (status) where.status = status;

      const [plans, total] = await Promise.all([
        prisma.sharedCarePlan.findMany({
          where,
          include: {
            goals: true,
            _count: { select: { sharedRecords: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.sharedCarePlan.count({ where }),
      ]);

      return NextResponse.json({
        data: plans,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to list shared care plans' });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as any,
    audit: { action: 'READ', resource: 'SharedCarePlan' },
  },
);
