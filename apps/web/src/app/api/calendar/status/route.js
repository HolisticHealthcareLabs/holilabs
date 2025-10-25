"use strict";
/**
 * Calendar Integrations - Status
 *
 * GET /api/calendar/status
 * Returns current status of all calendar integrations for the user
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = exports.dynamic = void 0;
const server_1 = require("next/server");
const prisma_1 = require("@/lib/prisma");
const middleware_1 = require("@/lib/api/middleware");
// Force dynamic rendering - prevents build-time evaluation
exports.dynamic = 'force-dynamic';
exports.GET = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        // Get all calendar integrations for the user
        const integrations = await prisma_1.prisma.calendarIntegration.findMany({
            where: {
                userId: context.user.id,
            },
            select: {
                id: true,
                provider: true,
                calendarEmail: true,
                calendarName: true,
                lastSyncAt: true,
                syncEnabled: true,
                syncErrors: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        // Format response
        const status = {
            google: integrations.find((i) => i.provider === 'GOOGLE') || null,
            microsoft: integrations.find((i) => i.provider === 'MICROSOFT') || null,
            apple: integrations.find((i) => i.provider === 'APPLE') || null,
        };
        return server_1.NextResponse.json({
            success: true,
            data: status,
        });
    }
    catch (error) {
        console.error('Calendar status error:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch calendar status', details: error.message }, { status: 500 });
    }
}, {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 60 },
    skipCsrf: true,
});
//# sourceMappingURL=route.js.map