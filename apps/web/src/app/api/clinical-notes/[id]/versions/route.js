"use strict";
/**
 * Clinical Note Version History API
 * HIPAA-compliant audit trail
 *
 * GET /api/clinical-notes/[id]/versions - Get all versions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = exports.dynamic = void 0;
const server_1 = require("next/server");
const middleware_1 = require("@/lib/api/middleware");
const version_control_1 = require("@/lib/clinical-notes/version-control");
const prisma_1 = require("@/lib/prisma");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
// ============================================================================
// GET /api/clinical-notes/[id]/versions
// ============================================================================
exports.GET = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    const { id } = context.params;
    // Verify note exists
    const note = await prisma_1.prisma.clinicalNote.findUnique({
        where: { id },
        select: {
            id: true,
            patientId: true,
        },
    });
    if (!note) {
        return server_1.NextResponse.json({
            success: false,
            error: 'Clinical note not found',
        }, { status: 404 });
    }
    // Get all versions
    const versions = await (0, version_control_1.getNoteVersions)(id);
    return server_1.NextResponse.json({
        success: true,
        data: {
            noteId: id,
            patientId: note.patientId,
            versions,
            totalVersions: versions.length,
        },
    });
}, {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 60 },
    skipCsrf: true,
});
//# sourceMappingURL=route.js.map