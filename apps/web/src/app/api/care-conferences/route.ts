import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const ScheduleConferenceSchema = z.object({
  careTeamId: z.string().min(1),
  patientId: z.string().min(1),
  title: z.string().min(1).max(300),
  scheduledAt: z.string().datetime(),
  agendaItems: z.array(z.string()).optional(),
  requiredAttendees: z.array(z.string()).default([]),
  optionalAttendees: z.array(z.string()).default([]),
  triggerReason: z.string().max(500).optional(),
  triggerSourceId: z.string().optional(),
});

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const body = await request.json();
      const parsed = ScheduleConferenceSchema.safeParse(body);

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
          { error: `Cannot schedule conference for a ${careTeam.status} care team` },
          { status: 409 },
        );
      }

      if (careTeam.patientId !== parsed.data.patientId) {
        return NextResponse.json(
          { error: 'Patient does not belong to this care team' },
          { status: 400 },
        );
      }

      const conference = await prisma.careConference.create({
        data: {
          careTeamId: parsed.data.careTeamId,
          patientId: parsed.data.patientId,
          title: parsed.data.title,
          scheduledAt: new Date(parsed.data.scheduledAt),
          agendaItems: parsed.data.agendaItems ?? [],
          requiredAttendees: parsed.data.requiredAttendees,
          optionalAttendees: parsed.data.optionalAttendees,
          triggerReason: parsed.data.triggerReason,
          triggerSourceId: parsed.data.triggerSourceId,
          status: 'SCHEDULED',
          scheduledBy: context.user.id,
        },
      });

      return NextResponse.json({ data: conference }, { status: 201 });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to schedule conference' });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as any,
    audit: { action: 'CREATE', resource: 'CareConference' },
  },
);

export const GET = createProtectedRoute(
  async (request: NextRequest, _context: any) => {
    try {
      const { searchParams } = new URL(request.url);
      const careTeamId = searchParams.get('careTeamId');
      const patientId = searchParams.get('patientId');
      const status = searchParams.get('status');
      const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
      const skip = (page - 1) * limit;

      const where: any = {};
      if (careTeamId) where.careTeamId = careTeamId;
      if (patientId) where.patientId = patientId;
      if (status) where.status = status;

      const [conferences, total] = await Promise.all([
        prisma.careConference.findMany({
          where,
          orderBy: { scheduledAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.careConference.count({ where }),
      ]);

      return NextResponse.json({
        data: conferences,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to list conferences' });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as any,
    audit: { action: 'READ', resource: 'CareConference' },
  },
);
