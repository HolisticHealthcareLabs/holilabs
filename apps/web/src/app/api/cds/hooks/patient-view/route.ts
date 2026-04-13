export const dynamic = "force-dynamic";
/**
 * CDS Hooks: patient-view
 *
 * Triggered when a clinician opens a patient's chart
 * Provides contextual alerts and recommendations
 *
 * POST /api/cds/hooks/patient-view
 *
 * @compliance CDS Hooks 2.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { cdsEngine } from '@/lib/cds/engines/cds-engine';
import type { CDSContext } from '@/lib/cds/types';
import { createAuditLog } from '@/lib/audit';
import logger from '@/lib/logger';

export const POST = createProtectedRoute(
  async (request: NextRequest, context) => {
    try {
      const body = await request.json();

      // Build CDS context for patient-view hook
      const cdsContext: CDSContext = {
        patientId: body.context.patientId,
        encounterId: body.context.encounterId,
        userId: body.context.userId || context.user?.id,
        hookInstance: body.hookInstance,
      hookType: 'patient-view',
      context: body.context,
      prefetch: body.prefetch,
    };

    logger.info(`🔍 [CDS Hooks] patient-view for patient ${cdsContext.patientId}`);

    const result = await cdsEngine.evaluate(cdsContext);
    const response = cdsEngine.formatAsCDSHooksResponse(result);

    // HIPAA Audit Log: CDS Hooks accessed patient data for clinical decision support
    await createAuditLog({
      action: 'READ',
      resource: 'CDSHooks',
      resourceId: cdsContext.patientId,
      details: {
        hookType: 'patient-view',
        hookInstance: body.hookInstance,
        patientId: cdsContext.patientId,
        encounterId: cdsContext.encounterId,
        cardsReturned: response.cards?.length || 0,
        accessType: 'CLINICAL_DECISION_SUPPORT',
      },
      success: true,
    });

      return NextResponse.json(response);
    } catch (error) {
      logger.error('❌ [CDS Hooks] patient-view error:', error);
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  },
  { roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] }
);
