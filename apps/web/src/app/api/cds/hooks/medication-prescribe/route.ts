/**
 * CDS Hooks: medication-prescribe
 *
 * Triggered when a clinician is prescribing medications
 * Checks for drug interactions, allergies, contraindications
 *
 * POST /api/cds/hooks/medication-prescribe
 *
 * @compliance CDS Hooks 2.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { cdsEngine } from '@/lib/cds/engines/cds-engine';
import type { CDSContext } from '@/lib/cds/types';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Build CDS context for medication-prescribe hook
    const cdsContext: CDSContext = {
      patientId: body.context.patientId,
      encounterId: body.context.encounterId,
      userId: body.context.userId || session.user.id,
      hookInstance: body.hookInstance,
      hookType: 'medication-prescribe',
      context: body.context,
      prefetch: body.prefetch,
    };

    console.log(
      `💊 [CDS Hooks] medication-prescribe for patient ${cdsContext.patientId} (${body.context.medications?.length || 0} medications)`
    );

    const result = await cdsEngine.evaluate(cdsContext);
    const response = cdsEngine.formatAsCDSHooksResponse(result);

    // Log critical alerts
    const criticalAlerts = result.alerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      console.log(
        `🚨 [CDS Hooks] ${criticalAlerts.length} CRITICAL alerts generated for medication-prescribe`
      );
    }

    // HIPAA Audit Log: CDS Hooks accessed patient data for medication safety check
    await createAuditLog({
      action: 'READ',
      resource: 'CDSHooks',
      resourceId: cdsContext.patientId,
      details: {
        hookType: 'medication-prescribe',
        hookInstance: body.hookInstance,
        patientId: cdsContext.patientId,
        encounterId: cdsContext.encounterId,
        medicationsCount: body.context.medications?.length || 0,
        cardsReturned: response.cards?.length || 0,
        criticalAlertsCount: criticalAlerts.length,
        accessType: 'MEDICATION_SAFETY_CHECK',
      },
      success: true,
      request,
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [CDS Hooks] medication-prescribe error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
