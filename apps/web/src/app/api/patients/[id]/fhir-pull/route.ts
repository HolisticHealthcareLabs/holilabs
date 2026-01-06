/**
 * FHIR Aggressive Pull API
 *
 * POST /api/patients/[id]/fhir-pull - Trigger FHIR data pull for a patient
 *
 * Request body:
 * {
 *   "fhirPatientId": "string",  // Patient ID on the FHIR server
 *   "fhirServerUrl": "string"   // Optional: Override default FHIR server
 * }
 *
 * Response:
 * {
 *   "success": boolean,
 *   "data": {
 *     "summary": {
 *       "observations": number,
 *       "conditions": number,
 *       "medications": number,
 *       "procedures": number
 *     },
 *     "errors": Array<{ resourceType: string, error: string }>,
 *     "durationMs": number
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute, verifyPatientAccess } from '@/lib/api/middleware';
import { aggressivePullPatientData } from '@/lib/fhir/aggressive-pull';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/patients/[id]/fhir-pull
 * Trigger aggressive FHIR data pull for a patient
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const patientId = context.params?.id;

    if (!patientId) {
      return NextResponse.json(
        { error: 'Patient ID required' },
        { status: 400 }
      );
    }

    // IDOR Protection: Verify user has access to this patient
    const hasAccess = await verifyPatientAccess(context.user!.id, patientId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to access this patient record' },
        { status: 403 }
      );
    }

    try {
      const body = await request.json();
      const { fhirPatientId, fhirServerUrl } = body;

      if (!fhirPatientId) {
        return NextResponse.json(
          { error: 'fhirPatientId is required' },
          { status: 400 }
        );
      }

      // Verify patient exists
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: { id: true, firstName: true, lastName: true },
      });

      if (!patient) {
        return NextResponse.json(
          { error: 'Patient not found' },
          { status: 404 }
        );
      }

      logger.info({
        event: 'fhir_pull_requested',
        patientId,
        fhirPatientId,
        userId: context.user.id,
      });

      // Trigger aggressive pull (this may take 5-30 seconds)
      const result = await aggressivePullPatientData(patientId, fhirPatientId);

      // Track pull request
      // @ts-ignore - userBehaviorEvent model not yet in Prisma schema
      await prisma.userBehaviorEvent.create({
        data: {
          userId: context.user.id,
          eventType: 'FHIR_PULL_REQUESTED',
          metadata: {
            patientId,
            fhirPatientId,
            success: result.success,
            totalResources: Object.values(result.summary).reduce((a, b) => a + b, 0),
            durationMs: result.durationMs,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return NextResponse.json({
        success: result.success,
        data: {
          summary: result.summary,
          errors: result.errors,
          durationMs: result.durationMs,
        },
        message: result.success
          ? `Successfully imported ${Object.values(result.summary).reduce((a, b) => a + b, 0)} resources`
          : 'FHIR pull completed with errors',
      });
    } catch (error: any) {
      logger.error({
        event: 'fhir_pull_request_failed',
        patientId,
        error: error.message,
        stack: error.stack,
      });

      return NextResponse.json(
        {
          error: 'Failed to pull FHIR data',
          message: error.message,
        },
        { status: 500 }
      );
    }
  },
  {
    roles: ['CLINICIAN', 'ADMIN'],
    audit: { action: 'READ', resource: 'Patient' },
  }
);
