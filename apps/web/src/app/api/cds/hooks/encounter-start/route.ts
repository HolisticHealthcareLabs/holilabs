/**
 * CDS Hooks: encounter-start
 *
 * Triggered when a clinician starts a clinical encounter
 * Provides preventive care reminders, overdue screenings, and care gaps
 *
 * POST /api/cds/hooks/encounter-start
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

    // Build CDS context for encounter-start hook
    const cdsContext: CDSContext = {
      patientId: body.context.patientId,
      encounterId: body.context.encounterId,
      userId: body.context.userId || session.user.id,
      hookInstance: body.hookInstance,
      hookType: 'encounter-start',
      context: body.context,
      prefetch: body.prefetch,
    };

    console.log(
      `🏥 [CDS Hooks] encounter-start for patient ${cdsContext.patientId} (encounter ${cdsContext.encounterId})`
    );

    const result = await cdsEngine.evaluate(cdsContext);
    const response = cdsEngine.formatAsCDSHooksResponse(result);

    // Log preventive care reminders
    const preventiveCareAlerts = result.alerts.filter(
      a => a.category === 'preventive-care' || a.category === 'guideline-recommendation'
    );

    if (preventiveCareAlerts.length > 0) {
      console.log(
        `📋 [CDS Hooks] ${preventiveCareAlerts.length} preventive care reminders for encounter-start`
      );
    }

    // HIPAA Audit Log: CDS Hooks accessed patient data at encounter start
    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email || 'unknown',
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      action: 'READ',
      resource: 'CDSHooks',
      resourceId: cdsContext.patientId,
      details: {
        hookType: 'encounter-start',
        hookInstance: body.hookInstance,
        patientId: cdsContext.patientId,
        encounterId: cdsContext.encounterId,
        cardsReturned: response.cards?.length || 0,
        preventiveCareAlertsCount: preventiveCareAlerts.length,
        accessType: 'CLINICAL_DECISION_SUPPORT',
      },
      success: true,
      request,
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [CDS Hooks] encounter-start error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
