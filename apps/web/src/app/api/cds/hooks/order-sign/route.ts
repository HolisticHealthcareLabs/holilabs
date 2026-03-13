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
import { createProtectedRoute } from '@/lib/api/middleware';
import { cdsEngine } from '@/lib/cds/engines/cds-engine';
import type { CDSContext } from '@/lib/cds/types';
import logger from '@/lib/logger';

export const POST = createProtectedRoute(
  async (request: NextRequest, context) => {
    try {
      const body = await request.json();

      // Build CDS context for order-sign hook
      const cdsContext: CDSContext = {
        patientId: body.context.patientId,
        encounterId: body.context.encounterId,
        userId: body.context.userId || context.user?.id,
      hookInstance: body.hookInstance,
      hookType: 'order-sign',
      context: body.context,
      prefetch: body.prefetch,
    };

    logger.info(
      `📝 [CDS Hooks] order-sign for patient ${cdsContext.patientId} (final safety check)`
    );

    const result = await cdsEngine.evaluate(cdsContext);
    const response = cdsEngine.formatAsCDSHooksResponse(result);

    // Log critical alerts - these should block order signing
    const criticalAlerts = result.alerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      logger.info(
        `🚨 [CDS Hooks] ${criticalAlerts.length} CRITICAL alerts generated for order-sign - may block order execution`
      );
    }

      return NextResponse.json(response);
    } catch (error) {
      logger.error('❌ [CDS Hooks] order-sign error:', error);
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  },
  { roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] }
);
