/**
 * Data Access Grant Detail API
 *
 * GET /api/access-grants/[id] - Get single access grant
 * PATCH /api/access-grants/[id] - Update access grant (revoke, extend, modify permissions)
 * DELETE /api/access-grants/[id] - Delete access grant
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/access-grants/[id]
 * Get single access grant with full details
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const grantId = context.params.id;

      const accessGrant = await prisma.dataAccessGrant.findUnique({
        where: { id: grantId },
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
          grantedToUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
          labResult: {
            select: {
              id: true,
              testName: true,
              testCode: true,
              resultDate: true,
              status: true,
              isAbnormal: true,
              isCritical: true,
            },
          },
          imagingStudy: {
            select: {
              id: true,
              modality: true,
              bodyPart: true,
              description: true,
              studyDate: true,
              status: true,
              isAbnormal: true,
            },
          },
        },
      });

      if (!accessGrant) {
        return NextResponse.json(
          { error: 'Access grant not found' },
          { status: 404 }
        );
      }

      // Compute status
      const now = new Date();
      const isExpired = accessGrant.expiresAt ? accessGrant.expiresAt <= now : false;
      const isRevoked = accessGrant.revokedAt !== null;
      const isActive = !isExpired && !isRevoked;

      return NextResponse.json({
        success: true,
        data: {
          ...accessGrant,
          isActive,
          isExpired,
          isRevoked,
        },
      });
    } catch (error: any) {
      console.error('Error fetching access grant:', error);
      return NextResponse.json(
        { error: 'Failed to fetch access grant', message: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'PATIENT'],
    rateLimit: { windowMs: 60000, maxRequests: 100 },
  }
);

/**
 * PATCH /api/access-grants/[id]
 * Update access grant - revoke, extend expiration, or modify permissions
 */
export const PATCH = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const grantId = context.params.id;
      const body = await request.json();

      // Check if grant exists
      const existing = await prisma.dataAccessGrant.findUnique({
        where: { id: grantId },
      });

      if (!existing) {
        return NextResponse.json(
          { error: 'Access grant not found' },
          { status: 404 }
        );
      }

      // Check if grant is already revoked
      if (existing.revokedAt && body.revoke) {
        return NextResponse.json(
          { error: 'Access grant is already revoked' },
          { status: 400 }
        );
      }

      const {
        revoke,
        revokedReason,
        expiresAt,
        canView,
        canDownload,
        canShare,
        purpose,
      } = body;

      // Prepare update data
      const updateData: any = {};

      // Handle revocation
      if (revoke === true) {
        updateData.revokedAt = new Date();
        updateData.revokedBy = context.user.id;
        updateData.revokedReason = revokedReason || 'Revoked by user';
      }

      // Update expiration
      if (expiresAt !== undefined) {
        updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
      }

      // Update permissions (only if not being revoked)
      if (!revoke) {
        if (canView !== undefined) updateData.canView = canView;
        if (canDownload !== undefined) updateData.canDownload = canDownload;
        if (canShare !== undefined) updateData.canShare = canShare;
        if (purpose !== undefined) updateData.purpose = purpose;
      }

      // Update the grant
      const updatedGrant = await prisma.dataAccessGrant.update({
        where: { id: grantId },
        data: updateData,
        include: {
          patient: {
            select: {
              firstName: true,
              lastName: true,
              mrn: true,
            },
          },
          grantedToUser: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
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
          action: revoke ? 'REVOKE' : 'UPDATE',
          resource: 'DataAccessGrant',
          resourceId: grantId,
          details: {
            changes: body,
            previousState: {
              revokedAt: existing.revokedAt,
              expiresAt: existing.expiresAt,
              permissions: {
                canView: existing.canView,
                canDownload: existing.canDownload,
                canShare: existing.canShare,
              },
            },
          },
          success: true,
        },
      });

      return NextResponse.json({
        success: true,
        data: updatedGrant,
        message: revoke ? 'Access grant revoked successfully' : 'Access grant updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating access grant:', error);
      return NextResponse.json(
        { error: 'Failed to update access grant', message: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'PATIENT'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
  }
);

/**
 * DELETE /api/access-grants/[id]
 * Delete access grant (hard delete - use with caution)
 * Note: In production, prefer revoking grants over deleting them for audit trail
 */
export const DELETE = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const grantId = context.params.id;

      // Check if grant exists
      const existing = await prisma.dataAccessGrant.findUnique({
        where: { id: grantId },
        include: {
          patient: {
            select: {
              firstName: true,
              lastName: true,
              mrn: true,
            },
          },
        },
      });

      if (!existing) {
        return NextResponse.json(
          { error: 'Access grant not found' },
          { status: 404 }
        );
      }

      // Only allow deletion of grants that were never accessed (security measure)
      if (existing.accessCount > 0) {
        return NextResponse.json(
          {
            error: 'Cannot delete grant that has been accessed. Please revoke instead.',
            suggestion: 'Use PATCH with revoke=true to revoke this grant while maintaining audit trail',
          },
          { status: 403 }
        );
      }

      // Delete the grant
      await prisma.dataAccessGrant.delete({
        where: { id: grantId },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: context.user.id,
          userEmail: context.user.email || 'unknown',
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          action: 'DELETE',
          resource: 'DataAccessGrant',
          resourceId: grantId,
          details: {
            deletedGrant: {
              grantedToType: existing.grantedToType,
              grantedToId: existing.grantedToId || existing.grantedToEmail,
              resourceType: existing.resourceType,
              patientId: existing.patientId,
              patientName: `${existing.patient.firstName} ${existing.patient.lastName}`,
            },
          },
          success: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Access grant deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting access grant:', error);
      return NextResponse.json(
        { error: 'Failed to delete access grant', message: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN'],
    rateLimit: { windowMs: 60000, maxRequests: 10 },
  }
);
