/**
 * Log patient data access with LGPD-compliant access reason
 *
 * LGPD Art. 11, II - Tutela da saúde
 * Law 25.326 (Argentina) Art. 5 - Purpose specification
 * @compliance Phase 2.4: Security Hardening - IDOR Protection
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AccessReason } from '@prisma/client';
import crypto from 'crypto';
import { createProtectedRoute, verifyPatientAccess } from '@/lib/api/middleware';

/**
 * POST /api/patients/[id]/log-access
 * Log access to patient data with LGPD compliance
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
    const { accessReason, accessPurpose } = body;

    // Validate access reason
    const validReasons: AccessReason[] = [
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

    if (!accessReason || !validReasons.includes(accessReason)) {
      return NextResponse.json(
        {
          error: 'Invalid access reason',
          validReasons,
          lgpdCompliance: 'LGPD Art. 6 - Purpose Limitation',
        },
        { status: 400 }
      );
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Get IP address and user agent
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                     request.headers.get('x-real-ip') ||
                     'unknown';
    const userAgent = request.headers.get('user-agent') || null;

    // Create data hash for integrity verification
    const dataHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ patientId, accessReason, accessPurpose, timestamp: new Date() }))
      .digest('hex');

    // Log to audit with access reason (LGPD compliance)
    await prisma.auditLog.create({
      data: {
        userId: context.user!.id,
        userEmail: context.user!.email || null,
        ipAddress,
        userAgent,
        action: 'READ',
        resource: 'Patient',
        resourceId: patientId,
        accessReason: accessReason as AccessReason,
        accessPurpose: accessPurpose || null,
        details: {
          patientName: `${patient.firstName} ${patient.lastName}`,
          lgpdCompliance: true,
          article: 'LGPD Art. 11, II - Tutela da saúde',
          law25326Article: 'Law 25.326 Art. 5 - Purpose Specification',
        },
        dataHash,
        success: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Access logged successfully',
      lgpdCompliance: true,
      auditTrail: {
        timestamp: new Date().toISOString(),
        accessReason,
        article: 'LGPD Art. 11, II',
      },
    });
  },
  {
    roles: ['CLINICIAN', 'ADMIN'],
    audit: { action: 'AUDIT', resource: 'PatientAccess' },
  }
);
