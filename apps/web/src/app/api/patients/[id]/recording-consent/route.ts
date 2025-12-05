/**
 * Recording Consent API
 *
 * POST   /api/patients/[id]/recording-consent - Grant recording consent
 * GET    /api/patients/[id]/recording-consent - Get consent status
 * DELETE /api/patients/[id]/recording-consent - Withdraw consent
 *
 * @compliance Phase 2.4: Security Hardening - IDOR Protection
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  recordConsent,
  withdrawConsent,
  getConsentStatus,
} from '@/lib/consent/recording-consent';
import { z } from 'zod';
import { createProtectedRoute, verifyPatientAccess } from '@/lib/api/middleware';

export const dynamic = 'force-dynamic';

const ConsentSchema = z.object({
  consentMethod: z.enum(['Portal', 'In-Person', 'Verbal', 'Written']),
  consentState: z.string().length(2), // Two-letter state code
  consentLanguage: z.string().optional(),
  consentVersion: z.string().optional(),
  consentSignature: z.string().optional(),
});

/**
 * POST /api/patients/[id]/recording-consent
 * Grant recording consent
 * @security IDOR protection - verifies user has access to patient
 */
export const POST = createProtectedRoute(
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

    const body = await request.json();

    // Validate input
    const validation = ConsentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid consent data',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const consentData = validation.data;

    // Record consent
    const result = await recordConsent(patientId, {
      ...consentData,
      clinicianId: context.user!.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  },
  {
    roles: ['CLINICIAN', 'ADMIN'],
    audit: { action: 'CREATE', resource: 'RecordingConsent' },
  }
);

/**
 * GET /api/patients/[id]/recording-consent
 * Get recording consent status
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

    // Get consent status
    const status = await getConsentStatus(patientId);

    return NextResponse.json({
      success: true,
      data: status,
    });
  },
  {
    roles: ['CLINICIAN', 'ADMIN'],
    audit: { action: 'READ', resource: 'RecordingConsent' },
  }
);

/**
 * DELETE /api/patients/[id]/recording-consent
 * Withdraw recording consent
 * @security IDOR protection - verifies user has access to patient
 */
export const DELETE = createProtectedRoute(
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

    // Withdraw consent
    const result = await withdrawConsent(patientId, context.user!.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  },
  {
    roles: ['CLINICIAN', 'ADMIN'],
    audit: { action: 'DELETE', resource: 'RecordingConsent' },
  }
);
