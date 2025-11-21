/**
 * Prescription Signing API
 *
 * POST /api/prescriptions/[id]/sign - Electronically sign prescription
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import crypto from 'crypto';
import { trackEvent, ServerAnalyticsEvents } from '@/lib/analytics/server-analytics';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * POST /api/prescriptions/[id]/sign
 * Electronically sign a prescription
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

      // Validate required fields
      if (!body.signatureMethod || !body.signatureData) {
        return NextResponse.json(
          { error: 'signatureMethod and signatureData are required' },
          { status: 400 }
        );
      }

      // Validate signature method
      if (!['pin', 'signature_pad'].includes(body.signatureMethod)) {
        return NextResponse.json(
          { error: 'signatureMethod must be "pin" or "signature_pad"' },
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

      // Verify access - only the prescribing clinician can sign
      if (prescription.clinicianId !== (request as any).user.id) {
        return NextResponse.json(
          { error: 'Forbidden: Only the prescribing clinician can sign this prescription' },
          { status: 403 }
        );
      }

      // Check if already signed
      if (prescription.status === 'SIGNED' || prescription.status === 'SENT') {
        return NextResponse.json(
          { error: 'Prescription is already signed' },
          { status: 400 }
        );
      }

      // Verify PIN if using PIN method
      if (body.signatureMethod === 'pin') {
        // TODO: Implement PIN verification against user's stored PIN
        // For now, we'll just validate the PIN format (4-6 digits)
        if (!/^\d{4,6}$/.test(body.signatureData)) {
          return NextResponse.json(
            { error: 'Invalid PIN format. Must be 4-6 digits.' },
            { status: 400 }
          );
        }

        // Hash the PIN for storage
        const hashedPin = crypto
          .createHash('sha256')
          .update(body.signatureData)
          .digest('hex');

        body.signatureData = hashedPin;
      }

      // Generate prescription hash if not already set
      let prescriptionHash = prescription.prescriptionHash;
      if (!prescriptionHash) {
        const prescriptionData = {
          patientId: prescription.patientId,
          clinicianId: prescription.clinicianId,
          medications: prescription.medications,
          timestamp: new Date().toISOString(),
        };

        prescriptionHash = crypto
          .createHash('sha256')
          .update(JSON.stringify(prescriptionData))
          .digest('hex');
      }

      // Update prescription with signature
      const signedPrescription = await prisma.prescription.update({
        where: { id: prescriptionId },
        data: {
          status: 'SIGNED',
          signatureMethod: body.signatureMethod,
          signatureData: body.signatureData,
          signedAt: new Date(),
          prescriptionHash,
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
          action: 'SIGN',
          resource: 'Prescription',
          resourceId: prescriptionId,
          details: {
            signatureMethod: body.signatureMethod,
            prescriptionHash,
            patientId: prescription.patientId,
          },
          success: true,
        },
      });

      // Track analytics event (NO PHI!)
      await trackEvent(
        ServerAnalyticsEvents.PRESCRIPTION_SIGNED,
        (request as any).user.id,
        {
          signatureMethod: body.signatureMethod,
          success: true,
        }
      );

      return NextResponse.json({
        success: true,
        data: signedPrescription,
        message: 'Prescription signed successfully',
      });
    } catch (error: any) {
      console.error('Error signing prescription:', error);
      return NextResponse.json(
        { error: 'Failed to sign prescription', details: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
    audit: { action: 'SIGN', resource: 'Prescription' },
  }
);
