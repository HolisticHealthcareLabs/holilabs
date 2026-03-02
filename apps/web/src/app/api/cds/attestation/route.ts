/**
 * CDS Attestation Gate API
 *
 * POST /api/cds/attestation - Check if clinician attestation is required
 *   before a safety-critical prescription can proceed.
 *
 * Returns attestation requirement status, missing/stale fields, legal basis,
 * and governance metadata.
 *
 * @compliance FDA 21 CFR Part 11, HIPAA Audit Trail
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import {
  checkAttestation,
  checkLabFreshness,
  getFailingCriticalFields,
} from '@/lib/clinical/safety/attestation-gate';
import {
  logAttestationRequired,
  getGovernanceMetadata,
} from '@/lib/clinical/safety/governance-events';
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';
import logger from '@/lib/logger';

// Type assertion for newer Prisma models
const db = prisma as any;

export const dynamic = 'force-dynamic';

const attestationSchema = z.object({
  patientId: z.string().min(1, 'patientId is required'),
  medication: z.string().optional(),
  patient: z.object({
    creatinineClearance: z.number().nullable().optional(),
    weight: z.number().nullable().optional(),
    age: z.number().nullable().optional(),
    labTimestamp: z.string().nullable().optional(),
  }),
});

/**
 * POST /api/cds/attestation
 * Check if clinician attestation is required for this patient/medication context
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const body = await request.json();
      const parsed = attestationSchema.safeParse(body);

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

      const { patientId, medication, patient } = parsed.data;

      // Run attestation gate check
      const result = checkAttestation({ medication, patient });

      // Check lab freshness separately for response enrichment
      const labFreshness = checkLabFreshness(patient.labTimestamp);

      // Get failing critical fields for structured response
      const failingCriticalFields = getFailingCriticalFields({
        creatinineClearance: patient.creatinineClearance ?? null,
        weight: patient.weight ?? null,
        age: patient.age ?? null,
      });

      // Log governance event if attestation required
      if (result.required) {
        logAttestationRequired({
          actor: context.user.id,
          patientId,
          medication: medication ?? 'unspecified',
          reason: result.reason ?? 'MISSING_DATA',
          missingFields: result.missingFields,
          staleSince: result.staleSince,
          traceId: context.requestId,
        });
      }

      const governance = getGovernanceMetadata({
        actor: context.user.id,
        patientId,
        traceId: context.requestId,
      });

      // Record AssuranceEvent for Clinical Ground Truth flywheel (accept flow)
      try {
        const patientIdHash = createHash('sha256')
          .update(patientId + (process.env.PATIENT_HASH_SALT || ''))
          .digest('hex');

        await db.assuranceEvent.create({
          data: {
            patientIdHash,
            eventType: 'ALERT',
            inputContextSnapshot: {
              patientId,
              medication,
              patient,
              labFreshness,
              failingCriticalFields,
            },
            aiRecommendation: {
              attestationRequired: result.required,
              reason: result.reason,
              legalBasis: result.legalBasis,
            },
            humanDecision: { action: 'ACCEPT', attestationRequired: result.required },
            humanOverride: false,
            clinicId: context.user.clinicId || 'default',
            decidedAt: new Date(),
          },
        });
      } catch (assuranceErr) {
        // Non-blocking — ground truth recording must not fail the attestation check
        logger.warn({
          event: 'assurance_event_creation_failed',
          source: 'cds_attestation',
          error: assuranceErr instanceof Error ? assuranceErr.message : 'Unknown',
        });
      }

      return NextResponse.json({
        attestationRequired: result.required,
        reason: result.reason ?? null,
        message: result.message,
        legalBasis: result.legalBasis,
        missingFields: result.missingFields ?? [],
        labFreshness,
        failingCriticalFields,
        governance,
      });
    } catch (error) {
      return safeErrorResponse(error, {
        userMessage: 'Attestation check failed',
      });
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN', 'NURSE'],
    rateLimit: { windowMs: 60_000, maxRequests: 120 },
    skipCsrf: true,
    audit: { action: 'CDS_ATTESTATION_CHECK', resource: 'ClinicalDecisionSupport' },
  }
);
