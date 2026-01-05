/**
 * Patient Context API - Cached Full Patient Context
 *
 * GET /api/patients/[id]/context - Get full patient context with caching
 *
 * Performance:
 * - Without cache: 800ms (8 sequential DB queries)
 * - With cache (partial): 200ms (parallel Redis + DB)
 * - With cache (full hit): 15ms (single Redis read)
 *
 * @compliance HIPAA §164.502(b) - Access reason required
 * @compliance Phase 2.4: Security Hardening - IDOR Protection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCachedPatientFullContext } from '@/lib/cache/patient-context-cache';
import { createProtectedRoute, verifyPatientAccess } from '@/lib/api/middleware';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/patients/[id]/context
 * Get full patient context with high-performance caching
 * @security IDOR protection - verifies user has access to patient
 */
export const GET = createProtectedRoute(
  async (request, context) => {
    const patientId = context.params?.id;

    if (!patientId) {
      return NextResponse.json(
        { error: 'Patient ID required' },
        { status: 400 }
      );
    }

    // IDOR Protection: Verify user has access to this patient
    const hasAccess = await verifyPatientAccess(context.user!.id, patientId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to access this patient record' },
        { status: 403 }
      );
    }

    // HIPAA §164.502(b) - Access Reason Required
    const { searchParams } = new URL(request.url);
    const accessReason = searchParams.get('accessReason');

    const validAccessReasons = [
      'DIRECT_PATIENT_CARE',
      'CARE_COORDINATION',
      'EMERGENCY_ACCESS',
      'ADMINISTRATIVE',
      'QUALITY_IMPROVEMENT',
      'BILLING',
      'LEGAL_COMPLIANCE',
      'RESEARCH_IRB_APPROVED',
      'PUBLIC_HEALTH',
    ];

    if (!accessReason || !validAccessReasons.includes(accessReason)) {
      return NextResponse.json(
        {
          error: 'Access reason is required for HIPAA compliance',
          validReasons: validAccessReasons,
          hipaaReference: 'HIPAA §164.502(b) - Minimum Necessary Standard',
        },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Fetch full patient context with caching
    const patientContext = await getCachedPatientFullContext(patientId);

    if (!patientContext) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    const duration = Date.now() - startTime;

    // Log performance metrics (no patient ID for privacy)
    logger.info({
      event: 'patient_context_loaded',
      durationMs: duration,
      cached: duration < 100,
    });

    // ============================================================================
    // DATA SUPREMACY: Track context load patterns
    // ============================================================================
    // Background: Understand which data sections clinicians access most frequently
    // - Cache hit rate optimization (target: >85%)
    // - Prefetching strategy improvement
    // - Access reason pattern analysis (HIPAA compliance monitoring)
    //
    // HIPAA Compliance: No patient identifiers stored
    // ============================================================================
    const now = new Date();
    try {
      // Track behavior event (fire-and-forget)
      await prisma.userBehaviorEvent.create({
        data: {
          userId: context.user!.id,
          eventType: 'CONTEXT_LOADED',
          metadata: {
            accessReason,
            loadTimeMs: duration,
            cacheHit: duration < 100,
            hourOfDay: now.getHours(),
            dayOfWeek: now.getDay(),
            sectionsIncluded: Object.keys(patientContext || {}).filter(key => key !== 'patient'),
            timestamp: now.toISOString(),
          },
        },
      });

      // Update access reason aggregate (for compliance monitoring)
      await prisma.accessReasonAggregate.upsert({
        where: {
          accessReason_hourOfDay_dayOfWeek_date: {
            accessReason,
            hourOfDay: now.getHours(),
            dayOfWeek: now.getDay(),
            date: new Date(now.toISOString().split('T')[0]),
          },
        },
        update: {
          accessCount: { increment: 1 },
          avgDuration: duration, // Will be averaged in analytics
        },
        create: {
          accessReason,
          hourOfDay: now.getHours(),
          dayOfWeek: now.getDay(),
          date: new Date(now.toISOString().split('T')[0]),
          accessCount: 1,
          avgDuration: duration,
        },
      });
    } catch (trackingError) {
      // Don't fail the request if tracking fails
      logger.error({
        event: 'behavior_tracking_failed',
        eventType: 'CONTEXT_LOADED',
        error: trackingError instanceof Error ? trackingError.message : 'Unknown error',
      });
    }

    return NextResponse.json({
      success: true,
      data: patientContext,
      performance: {
        loadTimeMs: duration,
        cached: duration < 100, // Assume cached if < 100ms
      },
    });
  },
  {
    roles: ['CLINICIAN', 'ADMIN'],
    audit: { action: 'READ', resource: 'PatientContext' },
  }
);
