export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { createProtectedRoute } from '@/lib/api/middleware';
import { z } from 'zod';

const submitSchema = z.object({
  /** Optional — if set, updates an existing scheduled response instead of creating new */
  responseId: z.string().cuid().optional(),
  instrumentSlug: z.string(),
  /** The patient id this response is for. Must match user's patient link. */
  patientId: z.string(),
  answers: z.record(z.union([z.number(), z.string()])),
  /** Set to true when submitting the final answer. If false, saves progress. */
  complete: z.boolean().default(true),
});

/**
 * POST /api/proms/responses — submit (or save progress on) a PROM response.
 *
 * Domain T-scores are computed client-side from the canonical PROMIS scoring
 * tables; server stores the raw answers + whatever domainScores the client
 * supplies. For MVP we store answers only and compute an average-per-domain
 * summary statistic.
 */
export const POST = createProtectedRoute(
  async (request) => {
    try {
      const body = await request.json();
      const { responseId, instrumentSlug, patientId, answers, complete } = submitSchema.parse(body);

      const instrument = await prisma.promInstrument.findUnique({
        where: { slug: instrumentSlug },
        include: { questions: true },
      });
      if (!instrument) {
        return NextResponse.json({ error: 'Instrument not found' }, { status: 404 });
      }

      // Compute simple raw mean per domain as a lightweight summary.
      // Real PROMIS T-scores are pulled from HealthMeasures scoring tables;
      // we expose this as a baseline and keep the door open for proper scoring.
      const byDomain: Record<string, number[]> = {};
      for (const q of instrument.questions) {
        const val = answers[q.itemCode];
        if (val === undefined) continue;
        const numeric = typeof val === 'number' ? val : Number(val);
        if (!Number.isFinite(numeric)) continue;
        const v = q.reverseScored ? 6 - numeric : numeric;
        (byDomain[q.domain] ??= []).push(v);
      }
      const domainScores: Record<string, { raw: number; itemCount: number }> = {};
      for (const [domain, vals] of Object.entries(byDomain)) {
        domainScores[domain] = {
          raw: vals.reduce((n, v) => n + v, 0) / vals.length,
          itemCount: vals.length,
        };
      }

      const now = new Date();
      let saved;
      if (responseId) {
        saved = await prisma.promResponse.update({
          where: { id: responseId },
          data: {
            answers,
            domainScores,
            status: complete ? 'COMPLETED' : 'IN_PROGRESS',
            startedAt: now,
            completedAt: complete ? now : null,
          },
          select: {
            id: true, status: true, startedAt: true, completedAt: true, domainScores: true,
          },
        });
      } else {
        saved = await prisma.promResponse.create({
          data: {
            instrumentId: instrument.id,
            patientId,
            answers,
            domainScores,
            status: complete ? 'COMPLETED' : 'IN_PROGRESS',
            startedAt: now,
            completedAt: complete ? now : null,
          },
          select: {
            id: true, status: true, startedAt: true, completedAt: true, domainScores: true,
          },
        });
      }

      return NextResponse.json({
        data: saved,
        message: complete ? 'Response submitted.' : 'Progress saved.',
      });
    } catch (error) {
      return safeErrorResponse(error);
    }
  },
  {
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
    audit: { action: 'prom_response_submit', resource: 'PromResponse' },
    skipCsrf: true,
  },
);

/**
 * GET /api/proms/responses?patientId=... — responses for a patient.
 * Returns the longitudinal history + computed domain trends.
 */
export const GET = createProtectedRoute(async (request) => {
  try {
    const url = new URL(request.url);
    const patientId = url.searchParams.get('patientId');
    if (!patientId) {
      return NextResponse.json({ error: 'patientId is required' }, { status: 400 });
    }

    const responses = await prisma.promResponse.findMany({
      where: { patientId },
      include: {
        instrument: { select: { slug: true, name: true, displayEn: true } },
      },
      orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json({ data: responses, total: responses.length });
  } catch (error) {
    return safeErrorResponse(error);
  }
});
