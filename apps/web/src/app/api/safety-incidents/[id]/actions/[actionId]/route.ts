import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';

export const dynamic = 'force-dynamic';

const UpdateActionSchema = z.object({
  status: z
    .enum(['PROPOSED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED'])
    .optional(),
  completionEvidence: z.string().optional(),
  verificationNotes: z.string().optional(),
});

export const PATCH = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const incidentId = context.params?.id;
      const actionId = context.params?.actionId;
      const body = await request.json();
      const parsed = UpdateActionSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.flatten() },
          { status: 422 },
        );
      }

      const action = await prisma.safetyCorrectiveAction.findUnique({
        where: { id: actionId },
        select: { id: true, incidentId: true },
      });

      if (!action) {
        return NextResponse.json(
          { error: 'Corrective action not found' },
          { status: 404 },
        );
      }

      if (action.incidentId !== incidentId) {
        return NextResponse.json(
          { error: 'Action does not belong to this incident' },
          { status: 404 },
        );
      }

      const data = parsed.data;
      const updateData: Record<string, unknown> = {};

      if (data.status) updateData.status = data.status;
      if (data.completionEvidence) updateData.completionEvidence = data.completionEvidence;
      if (data.verificationNotes) updateData.verificationNotes = data.verificationNotes;

      if (data.status === 'COMPLETED') {
        updateData.completedAt = new Date();
      }

      if (data.status === 'VERIFIED') {
        updateData.verifiedAt = new Date();
        updateData.verifiedById = context.user?.id;
      }

      const updated = await prisma.safetyCorrectiveAction.update({
        where: { id: actionId },
        data: updateData,
      });

      return NextResponse.json({ data: updated });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to update corrective action' });
    }
  },
  {
    roles: ['ADMIN', 'PHYSICIAN'] as any,
    audit: { action: 'UPDATE', resource: 'SafetyCorrectiveAction' },
  },
);
