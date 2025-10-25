"use strict";
/**
 * Scribe Session Detail API
 *
 * GET /api/scribe/sessions/:id - Get session with transcription and SOAP note
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = exports.dynamic = void 0;
const server_1 = require("next/server");
const middleware_1 = require("@/lib/api/middleware");
const prisma_1 = require("@/lib/prisma");
exports.dynamic = 'force-dynamic';
/**
 * GET /api/scribe/sessions/:id
 * Get session details with transcription and SOAP note
 */
exports.GET = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        const sessionId = context.params.id;
        // Verify session belongs to this clinician
        const session = await prisma_1.prisma.scribeSession.findFirst({
            where: {
                id: sessionId,
                clinicianId: context.user.id,
            },
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
                clinician: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        specialty: true,
                    },
                },
                transcription: true,
                soapNote: true,
            },
        });
        if (!session) {
            return server_1.NextResponse.json({ error: 'Session not found or access denied' }, { status: 404 });
        }
        return server_1.NextResponse.json({
            success: true,
            data: session,
        });
    }
    catch (error) {
        console.error('Error fetching session:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch session', message: error.message }, { status: 500 });
    }
});
//# sourceMappingURL=route.js.map