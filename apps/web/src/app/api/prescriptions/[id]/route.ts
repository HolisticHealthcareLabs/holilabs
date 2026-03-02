/**
 * Single Prescription API
 *
 * GET /api/prescriptions/[id] - Get single prescription
 * PATCH /api/prescriptions/[id] - Update prescription
 * DELETE /api/prescriptions/[id] - Delete prescription
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/prescriptions/[id]
 * Get a single prescription by ID
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const prescriptionId = context.params?.id;

      if (!prescriptionId) {
        return NextResponse.json(
          { error: 'Prescription ID is required' },
          { status: 400 }
        );
      }

      const prescription = await prisma.prescription.findUnique({
        where: { id: prescriptionId },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              tokenId: true,
              dateOfBirth: true,
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

      // Verify access - only the prescribing clinician or ADMIN can view
      if (
        prescription.clinicianId !== context.user.id &&
        context.user.role !== 'ADMIN'
      ) {
        return NextResponse.json(
          { error: 'Forbidden: You cannot access this prescription' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        data: prescription,
      });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to fetch prescription' });
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 100 },
    audit: { action: 'READ', resource: 'Prescription' },
    skipCsrf: true,
  }
);

/**
 * PATCH /api/prescriptions/[id]
 * Update prescription (mainly for status changes)
 */
export const PATCH = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const prescriptionId = context.params?.id;

      if (!prescriptionId) {
        return NextResponse.json(
          { error: 'Prescription ID is required' },
          { status: 400 }
        );
      }
      const body = await request.json();

      // Find existing prescription
      const existingPrescription = await prisma.prescription.findUnique({
        where: { id: prescriptionId },
      });

      if (!existingPrescription) {
        return NextResponse.json(
          { error: 'Prescription not found' },
          { status: 404 }
        );
      }

      // Verify access - only the prescribing clinician or ADMIN can update
      if (
        existingPrescription.clinicianId !== context.user.id &&
        context.user.role !== 'ADMIN'
      ) {
        return NextResponse.json(
          { error: 'Forbidden: You cannot update this prescription' },
          { status: 403 }
        );
      }

      // Update prescription
      const updatedPrescription = await prisma.prescription.update({
        where: { id: prescriptionId },
        data: {
          status: body.status,
          instructions: body.instructions,
          diagnosis: body.diagnosis,
          sentToPharmacy: body.sentToPharmacy,
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
          userId: context.user.id,
          userEmail: context.user.email || 'unknown',
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          action: 'UPDATE',
          resource: 'Prescription',
          resourceId: prescriptionId,
          details: {
            changes: body,
          },
          success: true,
        },
      });

      return NextResponse.json({
        success: true,
        data: updatedPrescription,
        message: 'Prescription updated successfully',
      });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to update prescription' });
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
    audit: { action: 'UPDATE', resource: 'Prescription' },
  }
);

/**
 * DELETE /api/prescriptions/[id]
 * Delete a prescription (ADMIN only or if status is PENDING)
 */
export const DELETE = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const prescriptionId = context.params?.id;

      if (!prescriptionId) {
        return NextResponse.json(
          { error: 'Prescription ID is required' },
          { status: 400 }
        );
      }

      // Find existing prescription
      const existingPrescription = await prisma.prescription.findUnique({
        where: { id: prescriptionId },
      });

      if (!existingPrescription) {
        return NextResponse.json(
          { error: 'Prescription not found' },
          { status: 404 }
        );
      }

      // Verify access - only the prescribing clinician or ADMIN can delete
      if (
        existingPrescription.clinicianId !== context.user.id &&
        context.user.role !== 'ADMIN'
      ) {
        return NextResponse.json(
          { error: 'Forbidden: You cannot delete this prescription' },
          { status: 403 }
        );
      }

      // Only allow deletion of PENDING or CANCELLED prescriptions
      if (!['PENDING', 'CANCELLED'].includes(existingPrescription.status)) {
        return NextResponse.json(
          {
            error: 'Cannot delete prescription',
            details: 'Only PENDING or CANCELLED prescriptions can be deleted',
          },
          { status: 400 }
        );
      }

      // Delete prescription
      await prisma.prescription.delete({
        where: { id: prescriptionId },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: context.user.id,
          userEmail: context.user.email || 'unknown',
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          action: 'DELETE',
          resource: 'Prescription',
          resourceId: prescriptionId,
          details: {
            deletedStatus: existingPrescription.status,
          },
          success: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Prescription deleted successfully',
      });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to delete prescription' });
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 20 },
    audit: { action: 'DELETE', resource: 'Prescription' },
  }
);
