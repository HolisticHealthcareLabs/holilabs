import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { triageForFullRCA } from '@/lib/rca/safety-rca';
import type { SafetyEvent } from '@/lib/rca/types';

export const dynamic = 'force-dynamic';

const CreateIncidentSchema = z.object({
  eventType: z.enum(['ADVERSE_EVENT', 'NEAR_MISS', 'SENTINEL']),
  severity: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']),
  title: z.string().min(1).max(500),
  description: z.string().min(1),
  patientId: z.string().optional(),
  encounterId: z.string().optional(),
  location: z.string().optional(),
  involvedStaff: z.array(z.string()).optional(),
  involvedSystems: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  dateOccurred: z.string().datetime(),
  isAnonymous: z.boolean().optional(),
});

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const body = await request.json();
      const parsed = CreateIncidentSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.flatten() },
          { status: 422 },
        );
      }

      const data = parsed.data;
      const isAnonymous = data.isAnonymous ?? false;

      const safetyEvent: SafetyEvent = {
        eventId: '',
        patientId: data.patientId ?? '',
        eventType: data.eventType,
        severity: data.severity,
        dateOccurred: new Date(data.dateOccurred),
        description: data.description,
        involvedStaff: data.involvedStaff ?? [],
        involvedSystems: data.involvedSystems ?? [],
        location: data.location,
        reportedBy: isAnonymous ? 'ANONYMOUS' : (context.user?.id ?? ''),
      };

      const requiresFullRCA = triageForFullRCA(safetyEvent);

      const incident = await prisma.safetyIncident.create({
        data: {
          ...(!isAnonymous && context.user?.id ? { reportedById: context.user.id } : {}),
          isAnonymous,
          patientId: data.patientId,
          encounterId: data.encounterId,
          eventType: data.eventType,
          severity: data.severity,
          title: data.title,
          description: data.description,
          location: data.location,
          involvedStaff: data.involvedStaff ?? [],
          involvedSystems: data.involvedSystems ?? [],
          tags: data.tags ?? [],
          dateOccurred: new Date(data.dateOccurred),
          requiresFullRCA,
        },
      });

      return NextResponse.json({ data: incident }, { status: 201 });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to create safety incident' });
    }
  },
  {
    audit: { action: 'CREATE', resource: 'SafetyIncident' },
  },
);

export const GET = createProtectedRoute(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const status = searchParams.get('status');
      const eventType = searchParams.get('eventType');
      const severity = searchParams.get('severity');
      const dateFrom = searchParams.get('dateFrom');
      const dateTo = searchParams.get('dateTo');
      const tags = searchParams.get('tags');
      const skip = parseInt(searchParams.get('skip') ?? '0', 10);
      const take = parseInt(searchParams.get('take') ?? '20', 10);

      const where: Record<string, unknown> = {};
      if (status) where.status = status;
      if (eventType) where.eventType = eventType;
      if (severity) where.severity = severity;
      if (tags) where.tags = { hasSome: tags.split(',') };
      if (dateFrom || dateTo) {
        const dateFilter: Record<string, Date> = {};
        if (dateFrom) dateFilter.gte = new Date(dateFrom);
        if (dateTo) dateFilter.lte = new Date(dateTo);
        where.dateOccurred = dateFilter;
      }

      const [incidents, total] = await Promise.all([
        prisma.safetyIncident.findMany({
          where,
          include: {
            _count: { select: { correctiveActions: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
        prisma.safetyIncident.count({ where }),
      ]);

      return NextResponse.json({ data: incidents, total, skip, take });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to list safety incidents' });
    }
  },
  {
    roles: ['ADMIN', 'PHYSICIAN', 'CLINICIAN'] as any,
    audit: { action: 'READ', resource: 'SafetyIncident' },
    skipCsrf: true,
  },
);
