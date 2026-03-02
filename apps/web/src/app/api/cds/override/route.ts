/**
 * CDS Override API
 *
 * POST /api/cds/override - Submit a safety rule override with reason code
 * GET  /api/cds/override - Get available override reason codes (for frontend dropdown)
 *
 * All overrides are logged as governance events for CMO review queue.
 *
 * @compliance FDA 21 CFR Part 11, HIPAA Audit Trail
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import {
  handleOverride,
  validateOverride,
  getAvailableReasonCodes,
} from '@/lib/clinical/safety/override-handler';
import { getGovernanceMetadata } from '@/lib/clinical/safety/governance-events';
import { emitGovernanceOverrideEvent } from '@/lib/socket-server';

export const dynamic = 'force-dynamic';

const overrideSchema = z.object({
  ruleId: z.string().min(1, 'ruleId is required'),
  severity: z.enum(['BLOCK', 'FLAG', 'ATTESTATION_REQUIRED']),
  reasonCode: z.enum([
    'CLINICAL_JUDGMENT_PALLIATIVE_CARE',
    'PATIENT_DECLINED_ALTERNATIVE',
    'CONTRAINDICATION_UNAVOIDABLE',
    'TIME_CRITICAL_EMERGENCY',
    'DOCUMENTED_TOLERANCE',
    'OTHER_DOCUMENTED',
  ]),
  patientId: z.string().min(1, 'patientId is required'),
  notes: z.string().optional(),
  traceId: z.string().optional(),
});

/**
 * POST /api/cds/override
 * Submit a safety rule override
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const body = await request.json();
      const parsed = overrideSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: parsed.error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        );
      }

      const { ruleId, severity, reasonCode, patientId, notes, traceId } = parsed.data;

      // Pre-validate to return structured errors instead of thrown exception
      const validation = validateOverride({
        ruleId,
        severity,
        reasonCode,
        actor: context.user.id,
        patientId,
        notes,
        traceId,
      });

      if (!validation.valid) {
        return NextResponse.json(
          {
            error: 'Override validation failed',
            details: validation.errors,
            warnings: validation.warnings,
          },
          { status: 422 }
        );
      }

      // Process the override — logs governance event internally
      const result = handleOverride({
        ruleId,
        severity,
        reasonCode,
        actor: context.user.id,
        patientId,
        notes,
        traceId: traceId ?? context.requestId,
      });

      // Emit real-time governance override event for Clinical Command Center
      try {
        emitGovernanceOverrideEvent({
          sessionId: result.eventId,
          ruleId,
          reason: reasonCode,
          userId: context.user.id,
          userName: context.user.name || context.user.email,
        });
      } catch {
        // Non-blocking — governance event emission must not fail the override
      }

      return NextResponse.json({
        eventId: result.eventId,
        reasonCode: result.reasonCode,
        governance: result.governance,
        warnings: validation.warnings,
      });
    } catch (error) {
      return safeErrorResponse(error, {
        userMessage: 'Override processing failed',
      });
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN'],
    rateLimit: { windowMs: 60_000, maxRequests: 30 },
    skipCsrf: true,
    audit: { action: 'CDS_OVERRIDE', resource: 'ClinicalDecisionSupport' },
  }
);

/**
 * GET /api/cds/override
 * Return available override reason codes for frontend dropdown
 */
export const GET = createProtectedRoute(
  async () => {
    const reasonCodes = getAvailableReasonCodes();
    return NextResponse.json({ reasonCodes });
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN', 'NURSE'],
    rateLimit: { windowMs: 60_000, maxRequests: 60 },
    skipCsrf: true,
  }
);
