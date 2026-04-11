import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED']).optional(),
  priority: z.enum(['URGENT', 'HIGH', 'NORMAL', 'LOW']).optional(),
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
  assignedToUserId: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  slaHours: z.number().int().positive().nullable().optional(),
  escalationReason: z.string().max(1000).optional(),
});

export const PATCH = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const careTeamId = context.params?.id;
      const taskId = context.params?.taskId;

      if (!careTeamId || !taskId) {
        return NextResponse.json(
          { error: 'Missing care team ID or task ID' },
          { status: 400 },
        );
      }

      const body = await request.json();
      const parsed = UpdateTaskSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation error', details: parsed.error.flatten() },
          { status: 422 },
        );
      }

      const task = await prisma.careTeamTask.findFirst({
        where: { id: taskId, careTeamId },
      });

      if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }

      const data: any = { ...parsed.data };

      if (data.dueDate !== undefined) {
        data.dueDate = data.dueDate ? new Date(data.dueDate) : null;
      }

      if (data.status === 'COMPLETED') {
        data.completedAt = new Date();
        data.completedBy = context.user.id;
      }

      if (parsed.data.escalationReason) {
        data.escalatedAt = new Date();
        data.escalatedTo = parsed.data.assignedToUserId ?? null;
        data.status = 'IN_PROGRESS';
      }

      const updated = await prisma.careTeamTask.update({
        where: { id: taskId },
        data,
      });

      return NextResponse.json({ data: updated });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to update task' });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as any,
    audit: { action: 'UPDATE', resource: 'CareTeamTask' },
  },
);
