"use strict";
/**
 * Imaging Study Detail API
 *
 * GET /api/imaging/[id] - Get single imaging study
 * PATCH /api/imaging/[id] - Update imaging study
 * DELETE /api/imaging/[id] - Delete imaging study
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DELETE = exports.PATCH = exports.GET = exports.dynamic = void 0;
const server_1 = require("next/server");
const middleware_1 = require("@/lib/api/middleware");
const prisma_1 = require("@/lib/prisma");
exports.dynamic = 'force-dynamic';
/**
 * GET /api/imaging/[id]
 * Get single imaging study with access control
 */
exports.GET = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        const imagingStudyId = context.params.id;
        const imagingStudy = await prisma_1.prisma.imagingStudy.findUnique({
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
            return server_1.NextResponse.json({ error: 'Imaging study not found' }, { status: 404 });
        }
        return server_1.NextResponse.json({
            success: true,
            data: imagingStudy,
        });
    }
    catch (error) {
        console.error('Error fetching imaging study:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch imaging study', message: error.message }, { status: 500 });
    }
}, {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 100 },
});
/**
 * PATCH /api/imaging/[id]
 * Update imaging study (e.g., add report, change status)
 */
exports.PATCH = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        const imagingStudyId = context.params.id;
        const body = await request.json();
        // Check if study exists
        const existing = await prisma_1.prisma.imagingStudy.findUnique({
            where: { id: imagingStudyId },
        });
        if (!existing) {
            return server_1.NextResponse.json({ error: 'Imaging study not found' }, { status: 404 });
        }
        // Update allowed fields
        const { status, findings, impression, isAbnormal, reportUrl, imageUrls, imageCount, thumbnailUrl, reportDate, reviewedDate, radiologist, notes, } = body;
        const updatedStudy = await prisma_1.prisma.imagingStudy.update({
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
        await prisma_1.prisma.auditLog.create({
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
        return server_1.NextResponse.json({
            success: true,
            data: updatedStudy,
        });
    }
    catch (error) {
        console.error('Error updating imaging study:', error);
        return server_1.NextResponse.json({ error: 'Failed to update imaging study', message: error.message }, { status: 500 });
    }
}, {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
});
/**
 * DELETE /api/imaging/[id]
 * Delete imaging study
 */
exports.DELETE = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        const imagingStudyId = context.params.id;
        // Check if study exists
        const existing = await prisma_1.prisma.imagingStudy.findUnique({
            where: { id: imagingStudyId },
        });
        if (!existing) {
            return server_1.NextResponse.json({ error: 'Imaging study not found' }, { status: 404 });
        }
        // Delete the study
        await prisma_1.prisma.imagingStudy.delete({
            where: { id: imagingStudyId },
        });
        // Create audit log
        await prisma_1.prisma.auditLog.create({
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
        return server_1.NextResponse.json({
            success: true,
            message: 'Imaging study deleted successfully',
        });
    }
    catch (error) {
        console.error('Error deleting imaging study:', error);
        return server_1.NextResponse.json({ error: 'Failed to delete imaging study', message: error.message }, { status: 500 });
    }
}, {
    roles: ['ADMIN'],
    rateLimit: { windowMs: 60000, maxRequests: 10 },
});
//# sourceMappingURL=route.js.map