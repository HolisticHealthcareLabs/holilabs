export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { createProtectedRoute } from '@/lib/api/middleware';
import { z } from 'zod';

const schema = z.object({
  templateSlug: z.string(),
  patientId: z.string(),
  /** ISO date — anchors POD 0 */
  indexDate: z.string().datetime(),
});

/**
 * POST /api/care-plans/assign — create a PatientCarePlan from a template.
 *
 * Materializes every template task as a PatientCarePlanTask with an absolute
 * scheduledFor = indexDate + dayOffset. For PROM_ASSESSMENT tasks, creates a
 * SCHEDULED PromResponse row linked via promResponseId — so the longitudinal
 * PROMs instrument schedule is auto-wired from the ERAS protocol.
 */
export const POST = createProtectedRoute(
  async (request, context) => {
    try {
      const body = await request.json();
      const { templateSlug, patientId, indexDate } = schema.parse(body);

      const template = await prisma.carePlanTemplate.findUnique({
        where: { slug: templateSlug },
        include: { tasks: { orderBy: { orderIndex: 'asc' } } },
      });
      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      const anchor = new Date(indexDate);
      const userId = context.user?.id;
      const assigningPhysician = userId
        ? await prisma.physicianCatalog.findFirst({
            where: { claimedByUserId: userId },
            select: { id: true },
          })
        : null;

      // Preload PROM instruments referenced by any PROM_ASSESSMENT task in the template
      const promSlugs = Array.from(
        new Set(template.tasks.map((t) => t.promInstrumentSlug).filter((s): s is string => Boolean(s))),
      );
      const promInstruments = promSlugs.length
        ? await prisma.promInstrument.findMany({
            where: { slug: { in: promSlugs } },
            select: { id: true, slug: true },
          })
        : [];
      const promBySlug = new Map(promInstruments.map((p) => [p.slug, p.id]));

      const created = await prisma.$transaction(async (tx) => {
        const plan = await tx.patientCarePlan.create({
          data: {
            templateId: template.id,
            patientId,
            indexDate: anchor,
            assignedByPhysicianId: assigningPhysician?.id ?? null,
            active: true,
          },
        });

        for (const tt of template.tasks) {
          const scheduledFor = new Date(anchor.getTime() + tt.dayOffset * 24 * 60 * 60 * 1000);

          let promResponseId: string | null = null;
          if (tt.kind === 'PROM_ASSESSMENT' && tt.promInstrumentSlug) {
            const instrumentId = promBySlug.get(tt.promInstrumentSlug);
            if (instrumentId) {
              const resp = await tx.promResponse.create({
                data: {
                  instrumentId,
                  patientId,
                  scheduledFor,
                  status: 'SCHEDULED',
                },
                select: { id: true },
              });
              promResponseId = resp.id;
            }
          }

          await tx.patientCarePlanTask.create({
            data: {
              carePlanId: plan.id,
              templateTaskId: tt.id,
              scheduledFor,
              phase: tt.phase,
              kind: tt.kind,
              title: tt.title,
              instructions: tt.instructions,
              promResponseId,
            },
          });
        }

        return plan;
      });

      return NextResponse.json({
        data: { carePlanId: created.id },
        message: `Care plan assigned. ${template.tasks.length} task(s) materialized against indexDate ${anchor.toISOString().slice(0,10)}.`,
      });
    } catch (error) {
      return safeErrorResponse(error);
    }
  },
  {
    rateLimit: { maxRequests: 15, windowMs: 60_000 },
    audit: { action: 'care_plan_assign', resource: 'PatientCarePlan' },
    skipCsrf: true,
  },
);
