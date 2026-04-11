/**
 * Lab Result Detail API
 *
 * GET /api/lab-results/[id] - Get single lab result
 * PATCH /api/lab-results/[id] - Update lab result
 * DELETE /api/lab-results/[id] - Delete lab result
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute, verifyPatientAccess } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { safeErrorResponse } from '@/lib/api/safe-error-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/lab-results/[id]
 * Get single lab result with access control
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const labResultId = context.params.id;

      const labResult = await prisma.labResult.findUnique({
        where: { id: labResultId },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              mrn: true,
              dateOfBirth: true,
            },
          },
          accessGrants: {
            where: {
              revokedAt: null,
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } },
              ],
            },
          },
        },
      });

      if (!labResult) {
        return NextResponse.json(
          { error: 'Lab result not found' },
          { status: 404 }
        );
      }

      const hasAccess = await verifyPatientAccess(context.user!.id, labResult.patientId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied: no clinical relationship with this patient' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        data: labResult,
      });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to fetch lab result' });
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 100 },
    skipCsrf: true,
    audit: { action: 'READ', resource: 'LabResult' },
  }
);

/**
 * PATCH /api/lab-results/[id]
 * Update lab result (e.g., change status from PRELIMINARY to FINAL)
 */
export const PATCH = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const labResultId = context.params.id;
      const body = await request.json();

      // Check if result exists
      const existing = await prisma.labResult.findUnique({
        where: { id: labResultId },
      });

      if (!existing) {
        return NextResponse.json(
          { error: 'Lab result not found' },
          { status: 404 }
        );
      }

      const hasAccess = await verifyPatientAccess(context.user!.id, existing.patientId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied: no clinical relationship with this patient' },
          { status: 403 }
        );
      }

      // Update allowed fields
      const {
        status,
        interpretation,
        isAbnormal,
        isCritical,
        reviewedDate,
        notes,
      } = body;

      const updatedResult = await prisma.labResult.update({
        where: { id: labResultId },
        data: {
          ...(status && { status }),
          ...(interpretation !== undefined && { interpretation }),
          ...(isAbnormal !== undefined && { isAbnormal }),
          ...(isCritical !== undefined && { isCritical }),
          ...(reviewedDate && { reviewedDate: new Date(reviewedDate) }),
          ...(notes !== undefined && { notes }),
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: context.user.id,
          userEmail: context.user.email || 'unknown',
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          action: 'UPDATE',
          resource: 'LabResult',
          resourceId: labResultId,
          details: {
            changes: body,
          },
          success: true,
        },
      });

      return NextResponse.json({
        success: true,
        data: updatedResult,
      });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to update lab result' });
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
    audit: { action: 'UPDATE', resource: 'LabResult' },
  }
);

/**
 * DELETE /api/lab-results/[id]
 * Delete lab result (soft delete recommended, but hard delete for now)
 */
export const DELETE = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const labResultId = context.params.id;

      // Check if result exists
      const existing = await prisma.labResult.findUnique({
        where: { id: labResultId },
      });

      if (!existing) {
        return NextResponse.json(
          { error: 'Lab result not found' },
          { status: 404 }
        );
      }

      // Delete the result
      await prisma.labResult.delete({
        where: { id: labResultId },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: context.user.id,
          userEmail: context.user.email || 'unknown',
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          action: 'DELETE',
          resource: 'LabResult',
          resourceId: labResultId,
          details: {
            deletedResult: {
              testName: existing.testName,
              resultDate: existing.resultDate,
              patientId: existing.patientId,
            },
          },
          success: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Lab result deleted successfully',
      });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to delete lab result' });
    }
  },
  {
    roles: ['ADMIN'],
    rateLimit: { windowMs: 60000, maxRequests: 10 },
    audit: { action: 'DELETE', resource: 'LabResult' },
  }
);
