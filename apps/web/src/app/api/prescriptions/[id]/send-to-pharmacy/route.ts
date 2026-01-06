/**
 * Send Prescription to Pharmacy API
 *
 * POST /api/prescriptions/[id]/send-to-pharmacy - Send prescription to pharmacy
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { trackEvent, ServerAnalyticsEvents } from '@/lib/analytics/server-analytics';
import logger from '@/lib/logger';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * POST /api/prescriptions/[id]/send-to-pharmacy
 * Send a signed prescription to a pharmacy
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context) => {
    try {
      const prescriptionId = context.params?.id;

      if (!prescriptionId) {
        return NextResponse.json(
          { error: 'Prescription ID is required' },
          { status: 400 }
        );
      }

      const body = await request.json();

      // Validate pharmacy ID
      if (!body.pharmacyId) {
        return NextResponse.json(
          { error: 'pharmacyId is required' },
          { status: 400 }
        );
      }

      // Find prescription
      const prescription = await prisma.prescription.findUnique({
        where: { id: prescriptionId },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              dateOfBirth: true,
              email: true,
              phone: true,
            },
          },
          clinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              licenseNumber: true,
              email: true,
            },
          },
        },
      });

      if (!prescription) {
        return NextResponse.json(
          { error: 'Prescription not found' },
          { status: 404 }
        );
      }

      // Verify access - only the prescribing clinician can send
      if (prescription.clinicianId !== (request as any).user.id) {
        return NextResponse.json(
          { error: 'Forbidden: Only the prescribing clinician can send this prescription' },
          { status: 403 }
        );
      }

      // Check if prescription is signed
      if (prescription.status !== 'SIGNED') {
        return NextResponse.json(
          { error: 'Prescription must be signed before sending to pharmacy' },
          { status: 400 }
        );
      }

      // Check if already sent
      if (prescription.sentToPharmacy) {
        return NextResponse.json(
          { error: 'Prescription has already been sent to a pharmacy' },
          { status: 400 }
        );
      }

      // TODO: Integrate with actual pharmacy network (NCPDP, Surescripts, etc.)
      // For now, we'll just update the database and log the event

      // Update prescription
      const updatedPrescription = await prisma.prescription.update({
        where: { id: prescriptionId },
        data: {
          status: 'SENT',
          sentToPharmacy: true,
          pharmacyId: body.pharmacyId,
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              tokenId: true,
            },
          },
          clinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              licenseNumber: true,
            },
          },
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: (request as any).user.id,
          userEmail: (request as any).user.email,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          action: 'UPDATE',
          resource: 'Prescription',
          resourceId: prescriptionId,
          details: {
            action: 'SEND_TO_PHARMACY',
            pharmacyId: body.pharmacyId,
            patientId: prescription.patientId,
            prescriptionHash: prescription.prescriptionHash,
          },
          success: true,
        },
      });

      // Track analytics event (NO PHI!)
      await trackEvent(
        ServerAnalyticsEvents.PRESCRIPTION_SENT,
        (request as any).user.id,
        {
          pharmacyId: body.pharmacyId,
          success: true,
        }
      );

      // TODO: Send notification to patient
      // - Email notification
      // - SMS notification
      // - In-app notification

      return NextResponse.json({
        success: true,
        data: updatedPrescription,
        message: 'Prescription sent to pharmacy successfully',
      });
    } catch (error: any) {
      logger.error({
        event: 'prescription_send_pharmacy_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      return NextResponse.json(
        {
          error: 'Failed to send prescription to pharmacy',
          ...(process.env.NODE_ENV === 'development' && {
            details: error.message,
          }),
        },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
    audit: { action: 'SEND_TO_PHARMACY', resource: 'Prescription' },
  }
);
