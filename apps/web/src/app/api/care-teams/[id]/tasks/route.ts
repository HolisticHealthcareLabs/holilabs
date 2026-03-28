import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const CreateTaskSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  assignedToRole: z
    .enum([
      'LEAD',
      'SPECIALIST',
      'NURSE',
      'COORDINATOR',
      'PHARMACIST',
      'SOCIAL_WORKER',
      'EXTERNAL_CONSULTANT',
    ])
    .optional(),
  assignedToUserId: z.string().optional(),
  priority: z.enum(['URGENT', 'HIGH', 'NORMAL', 'LOW']).default('NORMAL'),
  dueDate: z.string().datetime().optional(),
  slaHours: z.number().int().positive().optional(),
});

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const careTeamId = context.params?.id;
      if (!careTeamId) {
        return NextResponse.json({ error: 'Missing care team ID' }, { status: 400 });
      }

      const body = await request.json();
      const parsed = CreateTaskSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation error', details: parsed.error.flatten() },
          { status: 422 },
        );
      }

      const careTeam = await prisma.careTeam.findUnique({
        where: { id: careTeamId },
        select: { id: true, patientId: true, status: true, owningOrgId: true },
      });

      if (!careTeam) {
        return NextResponse.json({ error: 'Care team not found' }, { status: 404 });
      }

      if (careTeam.status !== 'ACTIVE') {
        return NextResponse.json(
          { error: `Cannot create tasks on a ${careTeam.status} care team` },
          { status: 409 },
        );
      }

      const task = await prisma.careTeamTask.create({
        data: {
          careTeamId,
          patientId: careTeam.patientId,
          title: parsed.data.title,
          description: parsed.data.description,
          assignedToRole: parsed.data.assignedToRole as any,
          assignedToUserId: parsed.data.assignedToUserId,
          priority: parsed.data.priority as any,
          dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
          slaHours: parsed.data.slaHours,
          status: 'PENDING',
          createdBy: context.user.id,
        },
      });

      return NextResponse.json({ data: task }, { status: 201 });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to create task' });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as any,
    audit: { action: 'CREATE', resource: 'CareTeamTask' },
  },
);

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const careTeamId = context.params?.id;
      if (!careTeamId) {
        return NextResponse.json({ error: 'Missing care team ID' }, { status: 400 });
      }

      const { searchParams } = new URL(request.url);
      const status = searchParams.get('status');
      const priority = searchParams.get('priority');
      const assignedToUserId = searchParams.get('assignedToUserId');
      const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
      const skip = (page - 1) * limit;

      const where: any = { careTeamId };
      if (status) where.status = status;
      if (priority) where.priority = priority;
      if (assignedToUserId) where.assignedToUserId = assignedToUserId;

      const [tasks, total] = await Promise.all([
        prisma.careTeamTask.findMany({
          where,
          orderBy: [
            { priority: 'asc' },
            { dueDate: 'asc' },
            { createdAt: 'desc' },
          ],
          skip,
          take: limit,
        }),
        prisma.careTeamTask.count({ where }),
      ]);

      return NextResponse.json({
        data: tasks,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to list tasks' });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as any,
    audit: { action: 'READ', resource: 'CareTeamTask' },
  },
);
