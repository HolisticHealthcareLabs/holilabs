export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { createProtectedRoute } from '@/lib/api/middleware';
import { z } from 'zod';

const patchSchema = z.object({
  status: z.enum(['PENDING', 'COMPLETED', 'SKIPPED', 'OVERDUE']),
  notes: z.string().max(2000).optional(),
});

/**
 * PATCH /api/care-plans/tasks/[id] — update a CarePlan task status.
 */
export const PATCH = createProtectedRoute(
  async (request, context) => {
    try {
      const id = context.params?.id;
      if (!id) return NextResponse.json({ error: 'Missing task id' }, { status: 400 });

      const body = await request.json();
      const { status, notes } = patchSchema.parse(body);

      const existing = await prisma.patientCarePlanTask.findUnique({
        where: { id },
        select: { id: true, status: true },
      });
      if (!existing) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

      const updated = await prisma.patientCarePlanTask.update({
        where: { id },
        data: {
          status,
          notes: notes ?? undefined,
          completedAt: status === 'COMPLETED' ? new Date() : null,
        },
        select: {
          id: true, status: true, completedAt: true, notes: true,
        },
      });

      return NextResponse.json({ data: updated, message: 'Task updated.' });
    } catch (error) {
      return safeErrorResponse(error);
    }
  },
  {
    audit: { action: 'care_plan_task_update', resource: 'PatientCarePlanTask' },
    skipCsrf: true,
  },
);
