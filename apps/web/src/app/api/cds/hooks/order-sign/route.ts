/**
 * CDS Hooks: order-sign
 *
 * Triggered when a clinician is signing/finalizing orders
 * Performs final safety checks before order execution
 *
 * POST /api/cds/hooks/order-sign
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

    // Build CDS context for order-sign hook
    const cdsContext: CDSContext = {
      patientId: body.context.patientId,
      encounterId: body.context.encounterId,
      userId: body.context.userId || session.user.id,
      hookInstance: body.hookInstance,
      hookType: 'order-sign',
      context: body.context,
      prefetch: body.prefetch,
    };

    console.log(
      `📝 [CDS Hooks] order-sign for patient ${cdsContext.patientId} (final safety check)`
    );

    const result = await cdsEngine.evaluate(cdsContext);
    const response = cdsEngine.formatAsCDSHooksResponse(result);

    // Log critical alerts - these should block order signing
    const criticalAlerts = result.alerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      console.log(
        `🚨 [CDS Hooks] ${criticalAlerts.length} CRITICAL alerts generated for order-sign - may block order execution`
      );
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [CDS Hooks] order-sign error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
