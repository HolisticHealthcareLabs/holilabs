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
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { cdsEngine } from '@/lib/cds/engines/cds-engine';
import type { CDSContext } from '@/lib/cds/types';

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

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [CDS Hooks] medication-prescribe error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
