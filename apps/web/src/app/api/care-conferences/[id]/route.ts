import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (_request: NextRequest, context: any) => {
    try {
      const conferenceId = context.params?.id;
      if (!conferenceId) {
        return NextResponse.json({ error: 'Missing conference ID' }, { status: 400 });
      }

      const conference = await prisma.careConference.findUnique({
        where: { id: conferenceId },
        include: {
          careTeam: {
            include: { members: { where: { isActive: true } } },
          },
        },
      });

      if (!conference) {
        return NextResponse.json({ error: 'Conference not found' }, { status: 404 });
      }

      return NextResponse.json({ data: conference });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to fetch conference' });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as any,
    audit: { action: 'READ', resource: 'CareConference' },
  },
);

const UpdateConferenceSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  scheduledAt: z.string().datetime().optional(),
  agendaItems: z.any().optional(),
  decisions: z.any().optional(),
  conflictsNoted: z.any().optional(),
  actionItems: z.any().optional(),
  requiredAttendees: z.array(z.string()).optional(),
  optionalAttendees: z.array(z.string()).optional(),
  summary: z.string().max(10000).optional(),
  nextConferenceDate: z.string().datetime().optional(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
});

export const PATCH = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const conferenceId = context.params?.id;
      if (!conferenceId) {
        return NextResponse.json({ error: 'Missing conference ID' }, { status: 400 });
      }

      const body = await request.json();
      const parsed = UpdateConferenceSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation error', details: parsed.error.flatten() },
          { status: 422 },
        );
      }

      const existing = await prisma.careConference.findUnique({
        where: { id: conferenceId },
        select: { id: true, status: true },
      });

      if (!existing) {
        return NextResponse.json({ error: 'Conference not found' }, { status: 404 });
      }

      const data: any = { ...parsed.data };

      if (data.scheduledAt) {
        data.scheduledAt = new Date(data.scheduledAt);
      }

      if (data.nextConferenceDate) {
        data.nextConferenceDate = new Date(data.nextConferenceDate);
      }

      const updated = await prisma.careConference.update({
        where: { id: conferenceId },
        data,
      });

      return NextResponse.json({ data: updated });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to update conference' });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as any,
    audit: { action: 'UPDATE', resource: 'CareConference' },
  },
);
