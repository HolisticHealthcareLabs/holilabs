/**
 * Patient Deletion Request API - GDPR/LGPD Right to Be Forgotten
 *
 * POST /api/patients/[id]/request-deletion - Request patient data deletion
 * GET  /api/patients/[id]/request-deletion - Get pending deletion requests
 *
 * @compliance GDPR Article 17, LGPD Article 18, CCPA
 * @security IDOR protection - verifies user has access to patient
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute, verifyPatientAccess } from '@/lib/api/middleware';
import { sendDeletionConfirmationEmail } from '@/lib/email/deletion-emails';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/patients/[id]/request-deletion
 * Create a new deletion request with email confirmation
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { id } = context.params;

    // IDOR Protection: Verify user has access to this patient
    const hasAccess = await verifyPatientAccess(context.user!.id, id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to access this patient record' },
        { status: 403 }
      );
    }

    try {
      const body = await request.json();
      const { reason, legalBasis } = body;

      // Check if patient exists
      const patient = await prisma.patient.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          deletedAt: true,
        },
      });

      if (!patient) {
        return NextResponse.json(
          { error: 'Patient not found' },
          { status: 404 }
        );
      }

      if (patient.deletedAt) {
        return NextResponse.json(
          { error: 'Patient data has already been deleted' },
          { status: 400 }
        );
      }

      // Check for existing pending deletion request
      const existingRequest = await prisma.deletionRequest.findFirst({
        where: {
          patientId: id,
          status: { in: ['PENDING_CONFIRMATION', 'CONFIRMED'] },
        },
      });

      if (existingRequest) {
        return NextResponse.json(
          {
            error: 'A deletion request is already pending for this patient',
            existingRequest: {
              status: existingRequest.status,
              requestedAt: existingRequest.requestedAt,
              confirmationDeadline: existingRequest.confirmationDeadline,
            },
          },
          { status: 409 }
        );
      }

      // Get IP address for compliance tracking
      const ipAddress = request.headers.get('x-forwarded-for') ||
                        request.headers.get('x-real-ip') ||
                        'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';

      // Create deletion request (30-day confirmation deadline)
      const confirmationDeadline = new Date();
      confirmationDeadline.setDate(confirmationDeadline.getDate() + 30);

      const deletionRequest = await prisma.deletionRequest.create({
        data: {
          patientId: id,
          status: 'PENDING_CONFIRMATION',
          confirmationDeadline,
          reason,
          legalBasis: legalBasis || 'GDPR_ARTICLE_17',
          ipAddress,
          userAgent,
        },
      });

      // Send confirmation email (if patient has email)
      if (patient.email) {
        try {
          await sendDeletionConfirmationEmail({
            email: patient.email,
            patientName: `${patient.firstName} ${patient.lastName}`,
            confirmationToken: deletionRequest.confirmationToken,
            confirmationDeadline: deletionRequest.confirmationDeadline,
          });
        } catch (emailError) {
          console.error('[Deletion Request] Failed to send confirmation email:', emailError);
          // Continue even if email fails - don't block the request
        }
      }

      // Audit log
      await createAuditLog(
        {
          action: 'CREATE',
          resource: 'DeletionRequest',
          resourceId: deletionRequest.id,
          details: {
            patientId: id,
            legalBasis: deletionRequest.legalBasis,
            reason,
          },
        },
        request,
        context.user.id,
        context.user.email
      );

      return NextResponse.json({
        success: true,
        message: 'Deletion request created. Please check your email to confirm.',
        request: {
          id: deletionRequest.id,
          status: deletionRequest.status,
          requestedAt: deletionRequest.requestedAt,
          confirmationDeadline: deletionRequest.confirmationDeadline,
        },
      });
    } catch (error: any) {
      console.error('[Deletion Request] Error creating deletion request:', error);
      return NextResponse.json(
        { error: 'Failed to create deletion request', details: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'PATIENT'],
    rateLimit: { windowMs: 3600000, maxRequests: 5 }, // 5 requests per hour
    audit: { action: 'CREATE', resource: 'DeletionRequest' },
  }
);

/**
 * GET /api/patients/[id]/request-deletion
 * Get pending deletion requests for a patient
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { id } = context.params;

    // IDOR Protection: Verify user has access to this patient
    const hasAccess = await verifyPatientAccess(context.user!.id, id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to access this patient record' },
        { status: 403 }
      );
    }

    try {
      const deletionRequests = await prisma.deletionRequest.findMany({
        where: { patientId: id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          requestedAt: true,
          confirmationDeadline: true,
          confirmedAt: true,
          scheduledDeletionAt: true,
          executedAt: true,
          reason: true,
          legalBasis: true,
          cancelledAt: true,
          cancellationReason: true,
        },
      });

      return NextResponse.json({
        success: true,
        requests: deletionRequests,
      });
    } catch (error: any) {
      console.error('[Deletion Request] Error fetching deletion requests:', error);
      return NextResponse.json(
        { error: 'Failed to fetch deletion requests' },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'PATIENT'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
    skipCsrf: true,
  }
);
