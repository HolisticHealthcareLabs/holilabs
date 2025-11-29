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
import { monitorLabResult } from '@/lib/prevention/lab-result-monitors';
import { onLabResultCreated } from '@/lib/cache/patient-context-cache';

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
      console.error('Error fetching lab results:', error);
      return NextResponse.json(
        { error: 'Failed to fetch lab results', message: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 100 },
  }
);

/**
 * POST /api/lab-results
 * Create new lab result
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const body = await request.json();

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
          category,
          orderingDoctor,
          performingLab,
          value,
          unit,
          referenceRange,
          status,
          interpretation,
          isAbnormal,
          isCritical,
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

        console.log('[Lab Result] Monitoring result:', {
          labResultId: labResult.id,
          testName: labResult.testName,
          monitored: monitoringResult.monitored,
          preventionPlanCreated: monitoringResult.result?.preventionPlanCreated,
        });
      } catch (monitorError) {
        // Don't fail the request if monitoring fails
        console.error('[Lab Result] Monitoring error:', monitorError);
      }

      // Invalidate patient context cache (labs, prevention plans, full context)
      try {
        await onLabResultCreated(labResult.patientId);
        console.log('[Cache] Invalidated patient context cache for lab result:', labResult.id);
      } catch (cacheError) {
        // Don't fail the request if cache invalidation fails
        console.error('[Cache] Cache invalidation error:', cacheError);
      }

      return NextResponse.json({
        success: true,
        data: labResult,
        monitoring: monitoringResult ? {
          monitored: monitoringResult.monitored,
          testType: monitoringResult.testType,
          preventionPlanCreated: monitoringResult.result?.preventionPlanCreated,
        } : null,
      });
    } catch (error: any) {
      console.error('Error creating lab result:', error);
      return NextResponse.json(
        { error: 'Failed to create lab result', message: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
  }
);
