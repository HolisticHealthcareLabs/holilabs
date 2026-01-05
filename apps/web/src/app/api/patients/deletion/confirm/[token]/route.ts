/**
 * Patient Deletion Confirmation API - GDPR/LGPD Right to Be Forgotten
 *
 * POST /api/patients/deletion/confirm/[token] - Confirm and execute deletion
 * GET  /api/patients/deletion/confirm/[token] - Get deletion request details
 *
 * @compliance GDPR Article 17, LGPD Article 18, CCPA
 * @security Token-based confirmation (no authentication required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendDeletionCompletedEmail } from '@/lib/email/deletion-emails';
import { logger } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/patients/deletion/confirm/[token]
 * Get deletion request details by confirmation token (for preview)
 */
export const GET = async (
  request: NextRequest,
  { params }: { params: { token: string } }
) => {
  try {
    const { token } = params;

    const deletionRequest = await prisma.deletionRequest.findUnique({
      where: { confirmationToken: token },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!deletionRequest) {
      return NextResponse.json(
        { error: 'Invalid confirmation token' },
        { status: 404 }
      );
    }

    // Check if already processed
    if (deletionRequest.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'This deletion request has already been completed' },
        { status: 400 }
      );
    }

    if (deletionRequest.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'This deletion request has been cancelled' },
        { status: 400 }
      );
    }

    // Check if expired
    if (new Date() > deletionRequest.confirmationDeadline) {
      // Mark as expired
      await prisma.deletionRequest.update({
        where: { id: deletionRequest.id },
        data: { status: 'EXPIRED' },
      });

      return NextResponse.json(
        { error: 'This deletion request has expired' },
        { status: 410 }
      );
    }

    return NextResponse.json({
      success: true,
      request: {
        id: deletionRequest.id,
        status: deletionRequest.status,
        requestedAt: deletionRequest.requestedAt,
        confirmationDeadline: deletionRequest.confirmationDeadline,
        patient: {
          name: `${deletionRequest.patient.firstName} ${deletionRequest.patient.lastName}`,
          email: deletionRequest.patient.email,
        },
      },
    });
  } catch (error: any) {
    logger.error({
      event: 'deletion_request_fetch_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error?.stack,
    });
    return NextResponse.json(
      {
        error: 'Failed to fetch deletion request',
        // Only include details in development
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message
        })
      },
      { status: 500 }
    );
  }
};

/**
 * POST /api/patients/deletion/confirm/[token]
 * Confirm and execute patient data deletion
 */
export const POST = async (
  request: NextRequest,
  { params }: { params: { token: string } }
) => {
  try {
    const { token } = params;

    // Get IP address for compliance tracking
    const confirmationIp = request.headers.get('x-forwarded-for') ||
                           request.headers.get('x-real-ip') ||
                           'unknown';

    const deletionRequest = await prisma.deletionRequest.findUnique({
      where: { confirmationToken: token },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            mrn: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!deletionRequest) {
      return NextResponse.json(
        { error: 'Invalid confirmation token' },
        { status: 404 }
      );
    }

    // Validate request state
    if (deletionRequest.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'This deletion request has already been completed' },
        { status: 400 }
      );
    }

    if (deletionRequest.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'This deletion request has been cancelled' },
        { status: 400 }
      );
    }

    // Check if expired
    if (new Date() > deletionRequest.confirmationDeadline) {
      await prisma.deletionRequest.update({
        where: { id: deletionRequest.id },
        data: { status: 'EXPIRED' },
      });

      return NextResponse.json(
        { error: 'This deletion request has expired' },
        { status: 410 }
      );
    }

    // Execute deletion in transaction
    await prisma.$transaction(async (tx) => {
      const patientId = deletionRequest.patientId;

      // ===================================================================
      // GDPR/LGPD COMPLIANT DATA ANONYMIZATION
      // ===================================================================
      // We anonymize instead of hard delete to preserve audit trail
      // and maintain referential integrity for historical clinical data

      // 1. Anonymize patient record
      const anonymizedMrn = `ANON-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      await tx.patient.update({
        where: { id: patientId },
        data: {
          firstName: 'DELETED',
          lastName: 'USER',
          email: null,
          phone: null,
          address: null,
          city: null,
          state: null,
          postalCode: null,
          country: 'ANON',

          // Brazilian identifiers
          cns: null,
          cpf: null,
          rg: null,

          // MRN anonymized (keep unique for referential integrity)
          mrn: anonymizedMrn,
          externalMrn: null,

          // Contact information
          emergencyContactName: null,
          emergencyContactPhone: null,
          emergencyContactRelation: null,
          primaryContactName: null,
          primaryContactPhone: null,
          primaryContactEmail: null,
          primaryContactAddress: null,
          secondaryContactName: null,
          secondaryContactPhone: null,
          secondaryContactEmail: null,

          // Photo and personal info
          photoUrl: null,
          preferredName: null,
          pronouns: null,
          culturalPreferences: null,

          // Mark as deleted
          deletedAt: new Date(),
          deletionReason: deletionRequest.legalBasis || 'GDPR_ARTICLE_17',
        },
      });

      // 2. Anonymize clinical notes (keep structure for clinical audit)
      await tx.clinicalNote.updateMany({
        where: { patientId },
        data: {
          subjective: '[CONTENT REDACTED PER PATIENT REQUEST - GDPR ARTICLE 17]',
          objective: '[CONTENT REDACTED PER PATIENT REQUEST - GDPR ARTICLE 17]',
          assessment: '[CONTENT REDACTED PER PATIENT REQUEST - GDPR ARTICLE 17]',
          plan: '[CONTENT REDACTED PER PATIENT REQUEST - GDPR ARTICLE 17]',
          chiefComplaint: '[REDACTED]',
          diagnosis: { set: [] },
        },
      });

      // 3. Anonymize SOAP notes
      await tx.sOAPNote.updateMany({
        where: { patientId },
        data: {
          subjective: '[REDACTED PER PATIENT REQUEST]',
          objective: '[REDACTED PER PATIENT REQUEST]',
          assessment: '[REDACTED PER PATIENT REQUEST]',
          plan: '[REDACTED PER PATIENT REQUEST]',
          chiefComplaint: '[REDACTED]',
        },
      });

      // 4. Delete documents (if applicable - would need file storage integration)
      // await deletePatientDocumentsFromStorage(patientId);

      // 5. Delete messages
      await tx.message.deleteMany({
        where: { patientId },
      });

      // 6. Update deletion request status
      await tx.deletionRequest.update({
        where: { id: deletionRequest.id },
        data: {
          status: 'COMPLETED',
          confirmedAt: new Date(),
          executedAt: new Date(),
          confirmationIp,
          confirmationMethod: 'email',
        },
      });

      // 7. Create immutable audit log
      await tx.auditLog.create({
        data: {
          userId: 'PATIENT_SELF_SERVICE',
          userEmail: 'deleted_user@system.local',
          ipAddress: confirmationIp,
          userAgent: request.headers.get('user-agent') || 'unknown',
          action: 'DELETE',
          resource: 'Patient',
          resourceId: patientId,
          details: {
            reason: deletionRequest.reason,
            legalBasis: deletionRequest.legalBasis,
            deletionRequestId: deletionRequest.id,
            anonymizedMrn,
          },
          success: true,
        },
      });
    });

    logger.info({
      event: 'patient_deletion_completed',
      deletionRequestId: deletionRequest.id,
      // No patient ID for privacy
    });

    // Send deletion completion email
    const patientEmail = deletionRequest.patient.email;
    const patientName = `${deletionRequest.patient.firstName} ${deletionRequest.patient.lastName}`;

    if (patientEmail) {
      try {
        await sendDeletionCompletedEmail(patientEmail, patientName);
        logger.info({
          event: 'deletion_completion_email_sent',
          // No email address for privacy
        });
      } catch (emailError) {
        // Log error but don't fail the deletion
        logger.error({
          event: 'deletion_completion_email_failed',
          error: emailError instanceof Error ? emailError.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Patient data has been successfully deleted',
      completedAt: new Date(),
    });
  } catch (error: any) {
    logger.error({
      event: 'patient_deletion_execution_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error?.stack,
    });
    return NextResponse.json(
      {
        error: 'Failed to execute deletion',
        // Only include details in development
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message
        })
      },
      { status: 500 }
    );
  }
};
