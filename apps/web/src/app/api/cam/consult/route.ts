export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { createProtectedRoute } from '@/lib/api/middleware';
import { runCamConsult } from '@/lib/cam/consult';
import { z } from 'zod';

const schema = z.object({
  chiefComplaint: z.string().trim().min(3).max(2000),
  activeMedClasses: z.array(z.string().min(1).max(100)).max(30).optional(),
  patientInterestedInCam: z.boolean().optional(),
  country: z.string().length(2).optional(),
  city: z.string().min(1).max(100).optional(),
  preferredSystemTypes: z
    .array(z.enum(['CONVENTIONAL', 'INTEGRATIVE', 'TRADITIONAL', 'COMPLEMENTARY']))
    .optional(),
});

/**
 * POST /api/cam/consult — clinician-gated CAM decision-support endpoint.
 *
 * Does NOT persist the request. No PHI crosses the LLM/RAG boundary
 * (current implementation is rule-based; future RAG will run behind the
 * existing de-identification wrapper maintained by the security session).
 */
export const POST = createProtectedRoute(
  async (request) => {
    try {
      const body = await request.json();
      const input = schema.parse(body);

      const result = await runCamConsult(prisma, input);

      return NextResponse.json({
        data: result,
        meta: {
          endpoint: '/api/cam/consult',
          ragActive: result.ragActive,
        },
      });
    } catch (error) {
      return safeErrorResponse(error);
    }
  },
  {
    rateLimit: { maxRequests: 60, windowMs: 60_000 },
    audit: { action: 'cam_consult', resource: 'ClinicalDecisionSupport' },
    skipCsrf: true,
  },
);
