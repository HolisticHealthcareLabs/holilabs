import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const StartConferenceSchema = z.object({
  actualAttendees: z.array(z.string()).min(1),
});

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const conferenceId = context.params?.id;
      if (!conferenceId) {
        return NextResponse.json({ error: 'Missing conference ID' }, { status: 400 });
      }

      const body = await request.json();
      const parsed = StartConferenceSchema.safeParse(body);

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

      if (conference.status !== 'SCHEDULED') {
        return NextResponse.json(
          { error: `Cannot start a conference with status "${conference.status}"` },
          { status: 409 },
        );
      }

      const updated = await prisma.careConference.update({
        where: { id: conferenceId },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          actualAttendees: parsed.data.actualAttendees,
        },
      });

      return NextResponse.json({ data: updated });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to start conference' });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as any,
    audit: { action: 'UPDATE', resource: 'CareConference' },
  },
);
