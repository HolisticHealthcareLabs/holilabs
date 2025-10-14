/**
 * Imaging Study Detail API
 *
 * GET /api/imaging/[id] - Get single imaging study
 * PATCH /api/imaging/[id] - Update imaging study
 * DELETE /api/imaging/[id] - Delete imaging study
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/imaging/[id]
 * Get single imaging study with access control
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const imagingStudyId = context.params.id;

      const imagingStudy = await prisma.imagingStudy.findUnique({
        where: { id: imagingStudyId },
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

      if (!imagingStudy) {
        return NextResponse.json(
          { error: 'Imaging study not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: imagingStudy,
      });
    } catch (error: any) {
      console.error('Error fetching imaging study:', error);
      return NextResponse.json(
        { error: 'Failed to fetch imaging study', message: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 100 },
  }
);

/**
 * PATCH /api/imaging/[id]
 * Update imaging study (e.g., add report, change status)
 */
export const PATCH = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const imagingStudyId = context.params.id;
      const body = await request.json();

      // Check if study exists
      const existing = await prisma.imagingStudy.findUnique({
        where: { id: imagingStudyId },
      });

      if (!existing) {
        return NextResponse.json(
          { error: 'Imaging study not found' },
          { status: 404 }
        );
      }

      // Update allowed fields
      const {
        status,
        findings,
        impression,
        isAbnormal,
        reportUrl,
        imageUrls,
        imageCount,
        thumbnailUrl,
        reportDate,
        reviewedDate,
        radiologist,
        notes,
      } = body;

      const updatedStudy = await prisma.imagingStudy.update({
        where: { id: imagingStudyId },
        data: {
          ...(status && { status }),
          ...(findings !== undefined && { findings }),
          ...(impression !== undefined && { impression }),
          ...(isAbnormal !== undefined && { isAbnormal }),
          ...(reportUrl !== undefined && { reportUrl }),
          ...(imageUrls !== undefined && { imageUrls }),
          ...(imageCount !== undefined && { imageCount }),
          ...(thumbnailUrl !== undefined && { thumbnailUrl }),
          ...(reportDate && { reportDate: new Date(reportDate) }),
          ...(reviewedDate && { reviewedDate: new Date(reviewedDate) }),
          ...(radiologist !== undefined && { radiologist }),
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
          resource: 'ImagingStudy',
          resourceId: imagingStudyId,
          details: {
            changes: body,
          },
          success: true,
        },
      });

      return NextResponse.json({
        success: true,
        data: updatedStudy,
      });
    } catch (error: any) {
      console.error('Error updating imaging study:', error);
      return NextResponse.json(
        { error: 'Failed to update imaging study', message: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
  }
);

/**
 * DELETE /api/imaging/[id]
 * Delete imaging study
 */
export const DELETE = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const imagingStudyId = context.params.id;

      // Check if study exists
      const existing = await prisma.imagingStudy.findUnique({
        where: { id: imagingStudyId },
      });

      if (!existing) {
        return NextResponse.json(
          { error: 'Imaging study not found' },
          { status: 404 }
        );
      }

      // Delete the study
      await prisma.imagingStudy.delete({
        where: { id: imagingStudyId },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: context.user.id,
          userEmail: context.user.email || 'unknown',
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          action: 'DELETE',
          resource: 'ImagingStudy',
          resourceId: imagingStudyId,
          details: {
            deletedStudy: {
              modality: existing.modality,
              bodyPart: existing.bodyPart,
              studyDate: existing.studyDate,
              patientId: existing.patientId,
            },
          },
          success: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Imaging study deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting imaging study:', error);
      return NextResponse.json(
        { error: 'Failed to delete imaging study', message: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN'],
    rateLimit: { windowMs: 60000, maxRequests: 10 },
  }
);
