/**
 * CDSS V3 - Summary Generation API
 *
 * POST /api/cdss/summary - Generate meeting summary from transcript
 *
 * This endpoint:
 * 1. Receives encounter transcript and patient context
 * 2. De-identifies transcript (removes PHI)
 * 3. Enqueues BullMQ job for async LLM processing
 * 4. Returns job ID for polling
 *
 * Frontend should poll /api/jobs/[jobId]/status for progress
 *
 * SECURITY: Transcript is de-identified BEFORE being stored or sent to LLM.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { z } from 'zod';
import { createSummaryService } from '@/lib/services/summary.service';
import { createAuditLog } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const ROLES = ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as const;

// Request validation schema
const SummaryRequestSchema = z.object({
  encounterId: z.string().min(1, 'Encounter ID is required'),
  transcript: z.string().min(10, 'Transcript must be at least 10 characters'),
  patientContext: z.object({
    age: z.number().int().min(0).max(150),
    sex: z.enum(['male', 'female', 'other']),
    conditions: z.array(z.string()).default([]),
    medications: z.array(z.string()).default([]),
  }),
  language: z.enum(['en', 'es', 'pt']).default('en'),
});

type SummaryRequest = z.infer<typeof SummaryRequestSchema>;

/**
 * POST /api/cdss/summary
 *
 * Generate a meeting summary from encounter transcript.
 * Returns job ID for status polling.
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: { user?: { id: string; role?: string } }) => {
    try {
      const providerId = context.user?.id;

      // Parse and validate request body
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid JSON body' },
          { status: 400 }
        );
      }

      const validationResult = SummaryRequestSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            details: validationResult.error.flatten().fieldErrors,
          },
          { status: 400 }
        );
      }

      const { encounterId, transcript, patientContext, language } = validationResult.data;

      // Verify encounter exists
      const encounter = await prisma.clinicalEncounter.findUnique({
        where: { id: encounterId },
        select: { id: true, patientId: true, providerId: true },
      });

      if (!encounter) {
        return NextResponse.json(
          { success: false, error: 'Encounter not found' },
          { status: 404 }
        );
      }

      // Verify provider has access to this encounter
      // (Provider must be the one assigned to the encounter or have admin role)
      if (encounter.providerId !== providerId && context.user?.role !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'You do not have access to this encounter' },
          { status: 403 }
        );
      }

      logger.info({
        event: 'summary_generation_request',
        encounterId,
        providerId,
        transcriptLength: transcript.length,
        language,
      });

      // Enqueue summary generation job
      // Note: The service handles de-identification internally
      const summaryService = createSummaryService();
      const jobId = await summaryService.enqueueGeneration(
        encounterId,
        transcript,
        patientContext,
        providerId!,
        language
      );

      // HIPAA Audit Log
      await createAuditLog({
        action: 'CREATE',
        resource: 'SummaryGenerationJob',
        resourceId: jobId,
        details: {
          encounterId,
          patientId: encounter.patientId,
          transcriptLength: transcript.length,
          language,
          // Note: We do NOT log the transcript itself (PHI)
        },
        success: true,
      });

      logger.info({
        event: 'summary_generation_job_created',
        jobId,
        encounterId,
        providerId,
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            jobId,
            message: 'Summary generation queued. Poll /api/jobs/{jobId}/status for progress.',
          },
        },
        { status: 202 }
      );
    } catch (error) {
      logger.error({
        event: 'summary_generation_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to queue summary generation',
          details: error instanceof Error ? error.message : undefined,
        },
        { status: 500 }
      );
    }
  },
  { roles: [...ROLES] }
);

/**
 * GET /api/cdss/summary?encounterId={id}
 *
 * Get the current summary draft for an encounter.
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: { user?: { id: string; role?: string } }) => {
    try {
      const { searchParams } = new URL(request.url);
      const encounterId = searchParams.get('encounterId');

      if (!encounterId) {
        return NextResponse.json(
          { success: false, error: 'Encounter ID is required' },
          { status: 400 }
        );
      }

      // Get encounter with summary draft
      const encounter = await prisma.clinicalEncounter.findUnique({
        where: { id: encounterId },
        select: {
          id: true,
          patientId: true,
          providerId: true,
          summaryDraft: true,
        },
      });

      if (!encounter) {
        return NextResponse.json(
          { success: false, error: 'Encounter not found' },
          { status: 404 }
        );
      }

      // Verify access
      if (encounter.providerId !== context.user?.id && context.user?.role !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'You do not have access to this encounter' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          encounterId,
          summaryDraft: encounter.summaryDraft,
          hasDraft: !!encounter.summaryDraft,
        },
      });
    } catch (error) {
      logger.error({
        event: 'summary_get_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to get summary',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...ROLES] }
);
