import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const CompleteConferenceSchema = z.object({
  decisions: z.array(z.string()).optional(),
  conflictsNoted: z.array(z.string()).optional(),
  actionItems: z
    .array(
      z.object({
        description: z.string(),
        assignedTo: z.string().optional(),
        dueDate: z.string().datetime().optional(),
      }),
    )
    .optional(),
  summary: z.string().min(1).max(10000),
  nextConferenceDate: z.string().datetime().optional(),
});

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const conferenceId = context.params?.id;
      if (!conferenceId) {
        return NextResponse.json({ error: 'Missing conference ID' }, { status: 400 });
      }

      const body = await request.json();
      const parsed = CompleteConferenceSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation error', details: parsed.error.flatten() },
          { status: 422 },
        );
      }

      const conference = await prisma.careConference.findUnique({
        where: { id: conferenceId },
        select: { id: true, status: true },
      });

      if (!conference) {
        return NextResponse.json({ error: 'Conference not found' }, { status: 404 });
      }

      if (conference.status !== 'IN_PROGRESS') {
        return NextResponse.json(
          { error: `Cannot complete a conference with status "${conference.status}"` },
          { status: 409 },
        );
      }

      const updated = await prisma.careConference.update({
        where: { id: conferenceId },
        data: {
          status: 'COMPLETED',
          endedAt: new Date(),
          decisions: parsed.data.decisions ?? [],
          conflictsNoted: parsed.data.conflictsNoted ?? [],
          actionItems: parsed.data.actionItems ?? [],
          summary: parsed.data.summary,
          nextConferenceDate: parsed.data.nextConferenceDate
            ? new Date(parsed.data.nextConferenceDate)
            : undefined,
        },
      });

      return NextResponse.json({ data: updated });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to complete conference' });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as any,
    audit: { action: 'UPDATE', resource: 'CareConference' },
  },
);
