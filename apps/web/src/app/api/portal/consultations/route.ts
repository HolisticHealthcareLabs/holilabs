export const dynamic = "force-dynamic";
/**
 * Patient Consultations API
 *
 * GET /api/portal/consultations
 * Fetch all consultation recordings for authenticated patient
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPatientPortalRoute, type PatientPortalContext } from '@/lib/api/patient-portal-middleware';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import logger from '@/lib/logger';

export const GET = createPatientPortalRoute(
  async (request: NextRequest, context: PatientPortalContext) => {
    const patientId = context.session.patientId;

    // @todo(recording-session-model): Query RecordingSession once added to Prisma schema
    logger.warn({ event: 'unimplemented_feature', feature: 'recording_session_query', patientId });
    const recordings: any[] = [];

    // HIPAA Audit Log: Patient accessed their consultations list
    await createAuditLog({
      action: 'READ',
      resource: 'RecordingSession',
      resourceId: patientId,
      details: {
        patientId,
        count: recordings.length,
        accessType: 'PATIENT_CONSULTATIONS_LIST',
      },
      success: true,
    });

    return NextResponse.json(
      { success: true, data: recordings },
      { status: 200 }
    );
  },
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 30 },
    audit: { action: 'READ', resource: 'Consultations' },
  }
);
