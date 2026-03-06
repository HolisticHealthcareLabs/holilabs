/**
 * CDS Hooks: medication-prescribe
 *
 * Triggered when a clinician is prescribing medications.
 * Checks for drug interactions, allergies, contraindications.
 *
 * POST /api/cds/hooks/medication-prescribe
 *
 * @compliance CDS Hooks 2.0
 *
 * Previously used getServerSession() directly which (a) returned null in the
 * Jest test environment (→ 401) and (b) prevented workspace context from
 * flowing into the AI factory. Migrated to createProtectedRoute so that:
 *  - The standard NODE_ENV=test bypass in middleware.ts works correctly.
 *  - context.user is available for workspace-scoped AI provider lookup.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { cdsEngine } from '@/lib/cds/engines/cds-engine';
import type { CDSContext } from '@/lib/cds/types';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const body = await request.json();

      // Build CDS context for medication-prescribe hook
      const cdsContext: CDSContext = {
        patientId: body.context.patientId,
        encounterId: body.context.encounterId,
        userId: body.context.userId || context.user.id,
        hookInstance: body.hookInstance,
        hookType: 'medication-prescribe',
        context: body.context,
        prefetch: body.prefetch,
      };

      const result = await cdsEngine.evaluate(cdsContext);
      const response = cdsEngine.formatAsCDSHooksResponse(result);

      // Log critical alerts
      const criticalAlerts = result.alerts.filter((a: any) => a.severity === 'critical');
      if (criticalAlerts.length > 0) {
        console.log(
          `[CDS Hooks] ${criticalAlerts.length} CRITICAL alerts for medication-prescribe`
        );
      }

      // HIPAA Audit Log
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
      });

      return NextResponse.json(response);
    } catch (error) {
      console.error('[CDS Hooks] medication-prescribe error:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN', 'NURSE'],
    skipCsrf: true, // CDS Hooks are called from EHR integration points
  }
);
