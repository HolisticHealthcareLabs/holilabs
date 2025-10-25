"use strict";
/**
 * Lab Result Detail API
 *
 * GET /api/lab-results/[id] - Get single lab result
 * PATCH /api/lab-results/[id] - Update lab result
 * DELETE /api/lab-results/[id] - Delete lab result
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DELETE = exports.PATCH = exports.GET = exports.dynamic = void 0;
const server_1 = require("next/server");
const middleware_1 = require("@/lib/api/middleware");
const prisma_1 = require("@/lib/prisma");
exports.dynamic = 'force-dynamic';
/**
 * GET /api/lab-results/[id]
 * Get single lab result with access control
 */
exports.GET = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        const labResultId = context.params.id;
        const labResult = await prisma_1.prisma.labResult.findUnique({
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
            return server_1.NextResponse.json({ error: 'Lab result not found' }, { status: 404 });
        }
        return server_1.NextResponse.json({
            success: true,
            data: labResult,
        });
    }
    catch (error) {
        console.error('Error fetching lab result:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch lab result', message: error.message }, { status: 500 });
    }
}, {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 100 },
});
/**
 * PATCH /api/lab-results/[id]
 * Update lab result (e.g., change status from PRELIMINARY to FINAL)
 */
exports.PATCH = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        const labResultId = context.params.id;
        const body = await request.json();
        // Check if result exists
        const existing = await prisma_1.prisma.labResult.findUnique({
            where: { id: labResultId },
        });
        if (!existing) {
            return server_1.NextResponse.json({ error: 'Lab result not found' }, { status: 404 });
        }
        // Update allowed fields
        const { status, interpretation, isAbnormal, isCritical, reviewedDate, notes, } = body;
        const updatedResult = await prisma_1.prisma.labResult.update({
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
        await prisma_1.prisma.auditLog.create({
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
        return server_1.NextResponse.json({
            success: true,
            data: updatedResult,
        });
    }
    catch (error) {
        console.error('Error updating lab result:', error);
        return server_1.NextResponse.json({ error: 'Failed to update lab result', message: error.message }, { status: 500 });
    }
}, {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
});
/**
 * DELETE /api/lab-results/[id]
 * Delete lab result (soft delete recommended, but hard delete for now)
 */
exports.DELETE = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        const labResultId = context.params.id;
        // Check if result exists
        const existing = await prisma_1.prisma.labResult.findUnique({
            where: { id: labResultId },
        });
        if (!existing) {
            return server_1.NextResponse.json({ error: 'Lab result not found' }, { status: 404 });
        }
        // Delete the result
        await prisma_1.prisma.labResult.delete({
            where: { id: labResultId },
        });
        // Create audit log
        await prisma_1.prisma.auditLog.create({
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
        return server_1.NextResponse.json({
            success: true,
            message: 'Lab result deleted successfully',
        });
    }
    catch (error) {
        console.error('Error deleting lab result:', error);
        return server_1.NextResponse.json({ error: 'Failed to delete lab result', message: error.message }, { status: 500 });
    }
}, {
    roles: ['ADMIN'],
    rateLimit: { windowMs: 60000, maxRequests: 10 },
});
//# sourceMappingURL=route.js.map