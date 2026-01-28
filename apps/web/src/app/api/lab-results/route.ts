/**
 * Lab Results API
 * HIPAA-compliant lab result management
 *
 * GET /api/lab-results - List lab results for a patient
 * POST /api/lab-results - Create new lab result
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { logger } from '@/lib/logger';
import { monitorLabResult } from '@/lib/prevention/lab-result-monitors';
import { onLabResultCreated } from '@/lib/cache/patient-context-cache';
import { emitLabResultEvent } from '@/lib/socket-server';
import {
  getReferenceRange,
  getReferenceRangeByTestName,
  interpretResult,
  getInterpretationText,
  calculateAge,
  formatReferenceRange,
} from '@/lib/clinical/lab-reference-ranges';
import {
  generateCriticalAlerts,
  generateTreatmentRecommendations,
  requiresImmediateNotification,
  getNotificationPriority,
} from '@/lib/clinical/lab-decision-rules';

export const dynamic = 'force-dynamic';

/**
 * GET /api/lab-results
 * List lab results for a patient
 * Query params: patientId (required), status, isAbnormal, isCritical
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const { searchParams } = new URL(request.url);
      const patientId = searchParams.get('patientId');
      const status = searchParams.get('status');
      const isAbnormal = searchParams.get('isAbnormal');
      const isCritical = searchParams.get('isCritical');

      if (!patientId) {
        return NextResponse.json(
          { error: 'patientId query parameter is required' },
          { status: 400 }
        );
      }

      // Build filter
      const where: any = { patientId };

      if (status) {
        where.status = status;
      }

      if (isAbnormal !== null) {
        where.isAbnormal = isAbnormal === 'true';
      }

      if (isCritical !== null) {
        where.isCritical = isCritical === 'true';
      }

      // Fetch results
      const labResults = await prisma.labResult.findMany({
        where,
        orderBy: { resultDate: 'desc' },
      });

      return NextResponse.json({
        success: true,
        data: labResults,
      });
    } catch (error: any) {
      logger.error({
        event: 'lab_results_fetch_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      return NextResponse.json(
        { error: 'Failed to fetch lab results' },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 100 },
    audit: {
      action: 'READ',
      resource: 'LabResult',
},
  }
);

/**
 * POST /api/lab-results
 * Create new lab result
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    let body: any;
    try {
      body = await request.json();

      const {
        patientId,
        testName,
        testCode,
        category,
        orderingDoctor,
        performingLab,
        value,
        unit,
        referenceRange,
        status = 'PRELIMINARY',
        interpretation,
        isAbnormal = false,
        isCritical = false,
        orderedDate,
        collectedDate,
        resultDate,
        notes,
        attachmentUrl,
      } = body;

      // Validate required fields
      if (!patientId || !testName || !resultDate) {
        return NextResponse.json(
          { error: 'Missing required fields: patientId, testName, resultDate' },
          { status: 400 }
        );
      }

      // Fetch patient demographics for reference range lookup
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: {
          dateOfBirth: true,
          gender: true,
        },
      });

      if (!patient) {
        return NextResponse.json(
          { error: 'Patient not found' },
          { status: 404 }
        );
      }

      // Calculate patient age
      const patientAge = calculateAge(patient.dateOfBirth);
      const patientGender = patient.gender || 'both';

      // Auto-populate reference ranges and interpretations based on LOINC codes
      let finalReferenceRange = referenceRange;
      let finalInterpretation = interpretation;
      let finalIsAbnormal = isAbnormal;
      let finalIsCritical = isCritical;
      let finalCategory = category;
      let clinicalContext: any = null;

      // Try to find reference range by LOINC code (most reliable)
      let range = null;
      if (testCode) {
        range = getReferenceRange(testCode, patientAge, patientGender);
      }

      // Fallback to test name if LOINC code not found
      if (!range && testName) {
        range = getReferenceRangeByTestName(testName, patientAge, patientGender);
      }

      // If we found a reference range and have a numeric value, interpret it
      if (range && value) {
        const numericValue = parseFloat(value);

        if (!isNaN(numericValue)) {
          // Auto-populate reference range if not provided
          if (!finalReferenceRange) {
            finalReferenceRange = formatReferenceRange(range);
          }

          // Auto-populate category if not provided
          if (!finalCategory) {
            finalCategory = range.category;
          }

          // Interpret the result
          const resultInterpretation = interpretResult(numericValue, range);
          const interpretationText = getInterpretationText(numericValue, range);

          // Auto-populate interpretation if not provided
          if (!finalInterpretation) {
            finalInterpretation = interpretationText;
          }

          // Set abnormal and critical flags based on interpretation
          finalIsAbnormal = resultInterpretation !== 'normal';
          finalIsCritical =
            resultInterpretation === 'critical-low' ||
            resultInterpretation === 'critical-high';

          // Generate clinical alerts and treatment recommendations
          const criticalAlerts = generateCriticalAlerts(
            testName,
            range.loincCode,
            numericValue,
            range,
            resultInterpretation
          );

          const treatmentRecommendations = generateTreatmentRecommendations(
            testName,
            range.loincCode,
            numericValue,
            range,
            resultInterpretation
          );

          const needsNotification = requiresImmediateNotification(
            resultInterpretation,
            criticalAlerts
          );

          const notificationPriority = getNotificationPriority(
            resultInterpretation,
            criticalAlerts
          );

          // Add clinical context for response
          clinicalContext = {
            loincCode: range.loincCode,
            testName: range.testName,
            category: range.category,
            clinicalSignificance: range.clinicalSignificance,
            interpretation: resultInterpretation,
            interpretationText: interpretationText,
            referenceRange: formatReferenceRange(range),
            criticalAlerts: criticalAlerts,
            treatmentRecommendations: treatmentRecommendations,
            requiresNotification: needsNotification,
            notificationPriority: notificationPriority,
          };

          logger.info({
            event: 'lab_result_auto_interpretation',
            testName,
            testCode,
            value: numericValue,
            interpretation: resultInterpretation,
            isAbnormal: finalIsAbnormal,
            isCritical: finalIsCritical,
            criticalAlertsCount: criticalAlerts.length,
            treatmentRecommendationsCount: treatmentRecommendations.length,
            requiresNotification: needsNotification,
            priority: notificationPriority,
          });

          // If critical alert requires notification, log it prominently
          if (needsNotification && criticalAlerts.length > 0) {
            logger.error({
              event: 'lab_result_critical_alert',
              patientId,
              testName,
              value: numericValue,
              alerts: criticalAlerts.map((a) => ({
                severity: a.severity,
                title: a.title,
                urgency: a.urgency,
              })),
            });
          }
        }
      }

      // Calculate hash for blockchain integrity
      const resultData = JSON.stringify({
        patientId,
        testName,
        testCode,
        value,
        unit,
        resultDate,
      });
      const resultHash = crypto.createHash('sha256').update(resultData).digest('hex');

      // Create lab result
      const labResult = await prisma.labResult.create({
        data: {
          patientId,
          testName,
          testCode,
          category: finalCategory,
          orderingDoctor,
          performingLab,
          value,
          unit,
          referenceRange: finalReferenceRange,
          status,
          interpretation: finalInterpretation,
          isAbnormal: finalIsAbnormal,
          isCritical: finalIsCritical,
          orderedDate: orderedDate ? new Date(orderedDate) : null,
          collectedDate: collectedDate ? new Date(collectedDate) : null,
          resultDate: new Date(resultDate),
          notes,
          attachmentUrl,
          resultHash,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: context.user.id,
          userEmail: context.user.email || 'unknown',
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          action: 'CREATE',
          resource: 'LabResult',
          resourceId: labResult.id,
          details: {
            patientId,
            testName,
            status,
          },
          success: true,
        },
      });

      // Automatic lab result monitoring (HbA1c, LDL, etc.)
      let monitoringResult = null;
      try {
        monitoringResult = await monitorLabResult({
          id: labResult.id,
          patientId: labResult.patientId,
          testName: labResult.testName,
          loincCode: labResult.testCode || undefined,
          value: labResult.value || '',
          unit: labResult.unit || '',
          referenceRange: labResult.referenceRange || undefined,
          flag: (labResult.isAbnormal ? 'HIGH' : 'NORMAL') as 'HIGH' | 'LOW' | 'CRITICAL' | 'NORMAL',
          observedAt: labResult.resultDate,
        });

        logger.info({
          event: 'lab_result_monitoring_complete',
          labResultId: labResult.id,
          testName: labResult.testName,
          monitored: monitoringResult.monitored,
          preventionPlanCreated: monitoringResult.result?.preventionPlanCreated,
        });
      } catch (monitorError) {
        // Don't fail the request if monitoring fails
        logger.error({
          event: 'lab_result_monitoring_error',
          error: monitorError instanceof Error ? monitorError.message : 'Unknown error',
          labResultId: labResult.id,
        });
      }

      // Invalidate patient context cache (labs, prevention plans, full context)
      try {
        await onLabResultCreated(labResult.patientId);
        logger.info({
          event: 'patient_cache_invalidated',
          patientId: labResult.patientId,
          labResultId: labResult.id,
        });
      } catch (cacheError) {
        // Don't fail the request if cache invalidation fails
        logger.error({
          event: 'cache_invalidation_error',
          error: cacheError instanceof Error ? cacheError.message : 'Unknown error',
          patientId: labResult.patientId,
          labResultId: labResult.id,
        });
      }

      // Emit Socket.IO event for real-time UI updates
      emitLabResultEvent({
        id: labResult.id,
        action: 'created',
        patientId: labResult.patientId,
        testName: labResult.testName,
        value: labResult.value || undefined,
        unit: labResult.unit || undefined,
        userId: context.user.id,
        userName: context.user.name || context.user.email,
      });

      return NextResponse.json({
        success: true,
        data: labResult,
        monitoring: monitoringResult ? {
          monitored: monitoringResult.monitored,
          testType: monitoringResult.testType,
          preventionPlanCreated: monitoringResult.result?.preventionPlanCreated,
        } : null,
        clinicalContext: clinicalContext, // Include clinical interpretation
      });
    } catch (error: any) {
      logger.error({
        event: 'lab_result_create_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        patientId: body?.patientId,
        testName: body?.testName,
      });
      return NextResponse.json(
        { error: 'Failed to create lab result' },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
  }
);
