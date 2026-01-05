/**
 * Lab Result Monitoring API
 *
 * POST /api/lab-results/monitor - Monitor a lab result and auto-flag critical values
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { monitorLabResult } from '@/lib/prevention/lab-result-monitors';
import { z } from 'zod';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const LabResultSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  testName: z.string(),
  loincCode: z.string().optional(),
  value: z.string(),
  unit: z.string(),
  referenceRange: z.string().optional(),
  flag: z.enum(['HIGH', 'LOW', 'CRITICAL', 'NORMAL']).optional(),
  observedAt: z.string().datetime(),
});

/**
 * POST /api/lab-results/monitor
 * Monitor a lab result and auto-create prevention plans if needed
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate input
    const validation = LabResultSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid lab result data',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const labResult = {
      ...validation.data,
      observedAt: new Date(validation.data.observedAt),
    };

    // Monitor lab result
    const result = await monitorLabResult(labResult);

    // HIPAA Audit Log: Lab result monitored for patient
    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email || 'unknown',
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      action: 'CREATE',
      resource: 'LabResultMonitor',
      resourceId: labResult.id,
      details: {
        labResultId: labResult.id,
        patientId: labResult.patientId,
        testName: labResult.testName,
        loincCode: labResult.loincCode,
        flag: labResult.flag,
        monitored: result.monitored,
        testType: result.testType,
        preventionPlanCreated: result.result?.preventionPlanCreated || false,
        accessType: 'LAB_RESULT_MONITORING',
      },
      success: true,
      request,
    });

    return NextResponse.json({
      success: true,
      message: result.monitored
        ? `Lab result monitored and ${result.result?.preventionPlanCreated ? 'prevention plan created' : 'no action needed'}`
        : 'Lab result not monitored (no matching rule)',
      data: {
        monitored: result.monitored,
        testType: result.testType,
        result: result.result,
      },
    });
  } catch (error) {
    console.error('Error monitoring lab result:', error);

    return NextResponse.json(
      {
        error: 'Failed to monitor lab result',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
