import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AccessReason } from '@prisma/client';
import crypto from 'crypto';

/**
 * Log patient data access with LGPD-compliant access reason
 *
 * LGPD Art. 11, II - Tutela da saúde
 * Law 25.326 (Argentina) Art. 5 - Purpose specification
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const patientId = params.id;
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
        userId: session.user.id,
        userEmail: session.user.email || null,
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
  } catch (error) {
    console.error('Access logging error:', error);

    return NextResponse.json(
      {
        error: 'Failed to log access',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
