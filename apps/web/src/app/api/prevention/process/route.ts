/**
 * Prevention Process API
 *
 * POST /api/prevention/process - Process transcript findings through the Prevention Engine
 *
 * This endpoint receives findings from the AI Scribe and generates real-time
 * prevention recommendations. It maintains a strict latency budget of ≤200ms
 * for the core processing.
 *
 * Phase 1: Foundation - Prevention Engine Service Integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, authOptions } from '@/lib/auth';
import { z } from 'zod';
import { preventionEngine, type TranscriptFindings } from '@/lib/services';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Request validation schema
const ProcessFindingsSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  encounterId: z.string().min(1, 'Encounter ID is required'),
  findings: z.object({
    chiefComplaint: z.string().default(''),
    symptoms: z.array(z.string()).default([]),
    diagnoses: z.array(z.string()).default([]),
    entities: z.object({
      vitals: z.array(
        z.object({
          type: z.string(),
          value: z.string(),
          unit: z.string(),
        })
      ).default([]),
      procedures: z.array(z.string()).default([]),
      medications: z.array(z.string()).default([]),
      anatomy: z.array(z.string()).default([]),
    }).default({
      vitals: [],
      procedures: [],
      medications: [],
      anatomy: [],
    }),
    rawTranscript: z.string().default(''),
  }),
});

/**
 * POST /api/prevention/process
 *
 * Process transcript findings and generate prevention recommendations.
 *
 * Request Body:
 * {
 *   patientId: string,
 *   encounterId: string,
 *   findings: TranscriptFindings
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   data: {
 *     recommendations: PreventionRecommendation[],
 *     detectedConditions: DetectedCondition[],
 *     processingTimeMs: number,
 *     encounterLinkId?: string
 *   },
 *   errors?: string[]
 * }
 */
export async function POST(request: NextRequest) {
  const requestStart = Date.now();

  try {
    // Authentication check
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    // Restrict to ADMIN and CLINICIAN roles
    const userRole = (session.user as { role?: string }).role;
    if (userRole && !['ADMIN', 'PHYSICIAN', 'NURSE', 'CLINICIAN'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = ProcessFindingsSchema.safeParse(body);

    if (!validation.success) {
      logger.warn({
        event: 'prevention_process_validation_failed',
        errors: validation.error.errors,
        userId: session.user.id,
      });

      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { patientId, encounterId, findings } = validation.data;

    logger.info({
      event: 'prevention_process_started',
      patientId,
      encounterId,
      userId: session.user.id,
      diagnosesCount: findings.diagnoses.length,
      symptomsCount: findings.symptoms.length,
    });

    // Process findings through Prevention Engine
    const result = await preventionEngine.processTranscriptFindings(
      patientId,
      encounterId,
      findings as TranscriptFindings
    );

    const totalRequestTime = Date.now() - requestStart;

    logger.info({
      event: 'prevention_process_completed',
      patientId,
      encounterId,
      userId: session.user.id,
      processingTimeMs: result.processingTimeMs,
      totalRequestTimeMs: totalRequestTime,
      recommendationsCount: result.recommendations.length,
      detectedConditionsCount: result.detectedConditions.length,
      errorsCount: result.errors.length,
    });

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        recommendations: result.recommendations,
        detectedConditions: result.detectedConditions,
        processingTimeMs: result.processingTimeMs,
        encounterLinkId: result.encounterLinkId,
      },
      errors: result.errors.length > 0 ? result.errors : undefined,
      meta: {
        totalRequestTimeMs: totalRequestTime,
        withinLatencyBudget: result.processingTimeMs < 200,
      },
    });
  } catch (error) {
    const totalRequestTime = Date.now() - requestStart;

    logger.error({
      event: 'prevention_process_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      totalRequestTimeMs: totalRequestTime,
    });

    return NextResponse.json(
      {
        error: 'Failed to process prevention findings',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/prevention/process
 *
 * Health check for the Prevention Engine service.
 * Returns status and configuration information.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      service: 'Prevention Engine',
      status: 'healthy',
      version: '1.0.0',
      features: {
        conditionDetection: true,
        screeningRecommendations: true,
        realTimeAlerts: true,
        encounterLinking: true,
      },
      latencyBudget: {
        target: 200,
        unit: 'ms',
      },
      supportedProtocols: [
        'USPSTF 2024',
        'ADA 2024',
        'ACC/AHA 2024',
        'WHO 2025',
        'NASCC 2025',
      ],
    });
  } catch (error) {
    logger.error({
      event: 'prevention_process_health_check_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        service: 'Prevention Engine',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
