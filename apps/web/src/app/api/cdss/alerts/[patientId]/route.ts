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
import { getServerSession } from '@/lib/auth';
import { createPreventionService } from '@/lib/services/prevention.service';
import { createAuditLog } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cdss/alerts/[patientId]
 *
 * Retrieves actionable prevention alerts for a patient.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { patientId } = params;

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: 'Patient ID is required' },
        { status: 400 }
      );
    }

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
      userId: session.user.id,
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
      patientId: params.patientId,
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
}
