/**
 * CDSS V3 - Alerts API
 *
 * GET /api/cdss/alerts/[patientId] - Get actionable prevention alerts for a patient
 *
 * Returns:
 * - Drug interactions
 * - Overdue screenings
 * - Critical lab values
 * - Recent hospitalizations
 *
 * All alerts are Zod-validated before returning.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPreventionService } from '@/lib/services/prevention.service';
import { createAuditLog } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { createProtectedRoute, requirePatientAccess } from '@/lib/api/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cdss/alerts/[patientId]
 *
 * Retrieves actionable prevention alerts for a patient.
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const patientId = context.params?.patientId;

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    try {
    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true },
    });

    if (!patient) {
      return NextResponse.json(
        { success: false, error: 'Patient not found' },
        { status: 404 }
      );
    }

    logger.info({
      event: 'alerts_fetch_start',
      patientId,
      userId: context.user!.id,
    });

    // Get alerts from prevention service
    const preventionService = createPreventionService();
    const alerts = await preventionService.getActionableAlerts(patientId);

    // HIPAA Audit Log - Alert access
    await createAuditLog({
      action: 'READ',
      resource: 'PreventionAlerts',
      resourceId: patientId,
      details: {
        alertCount: alerts.length,
        criticalCount: alerts.filter(a => a.severity === 'critical').length,
        warningCount: alerts.filter(a => a.severity === 'warning').length,
      },
      success: true,
    });

    logger.info({
      event: 'alerts_fetch_complete',
      patientId,
      alertCount: alerts.length,
    });

    return NextResponse.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    logger.error({
      event: 'alerts_fetch_error',
      patientId: context.params?.patientId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch alerts',
      },
      { status: 500 }
    );
  }
  },
  { roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'], customMiddlewares: [requirePatientAccess()] }
);
