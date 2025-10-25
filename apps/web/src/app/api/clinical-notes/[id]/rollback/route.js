"use strict";
/**
 * Clinical Note Rollback API
 * Admin-only: Rollback note to a previous version
 *
 * POST /api/clinical-notes/[id]/rollback
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = exports.dynamic = void 0;
const server_1 = require("next/server");
const middleware_1 = require("@/lib/api/middleware");
const version_control_1 = require("@/lib/clinical-notes/version-control");
const prisma_1 = require("@/lib/prisma");
const zod_1 = require("zod");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
const RollbackSchema = zod_1.z.object({
    versionId: zod_1.z.string().cuid(),
    reason: zod_1.z.string().optional(), // Why the rollback is being performed
});
// ============================================================================
// POST /api/clinical-notes/[id]/rollback
// ============================================================================
exports.POST = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    const { id } = context.params;
    const body = await request.json();
    const validated = RollbackSchema.parse(body);
    // Verify note exists
    const note = await prisma_1.prisma.clinicalNote.findUnique({
        where: { id },
        select: {
            id: true,
            patientId: true,
            authorId: true,
        },
    });
    if (!note) {
        return server_1.NextResponse.json({
            success: false,
            error: 'Clinical note not found',
        }, { status: 404 });
    }
    // Get user ID from request (should be set by middleware)
    const userId = request.headers.get('x-user-id');
    if (!userId) {
        return server_1.NextResponse.json({
            success: false,
            error: 'User not authenticated',
        }, { status: 401 });
    }
    // Get IP and user agent for audit
    const ipAddress = request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip') ||
        'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    try {
        // Perform rollback
        const updatedNote = await (0, version_control_1.rollbackToVersion)({
            noteId: id,
            versionId: validated.versionId,
            rolledBackBy: userId,
            ipAddress,
            userAgent,
        });
        // Log in audit trail
        await prisma_1.prisma.auditLog.create({
            data: {
                userId,
                action: 'ROLLBACK',
                resource: 'ClinicalNote',
                resourceId: id,
                details: {
                    versionId: validated.versionId,
                    reason: validated.reason,
                },
                ipAddress,
                userAgent,
            },
        });
        return server_1.NextResponse.json({
            success: true,
            data: updatedNote,
            message: 'Note successfully rolled back to previous version',
        });
    }
    catch (error) {
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Rollback failed',
        }, { status: 500 });
    }
}, {
    roles: ['ADMIN'], // Only admins can rollback notes
    rateLimit: { windowMs: 60000, maxRequests: 10 },
    audit: { action: 'ROLLBACK', resource: 'ClinicalNote' },
});
//# sourceMappingURL=route.js.map