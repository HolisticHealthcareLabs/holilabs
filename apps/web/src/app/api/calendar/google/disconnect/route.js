"use strict";
/**
 * Google Calendar OAuth - Disconnect
 *
 * DELETE /api/calendar/google/disconnect
 * Revokes access and removes calendar integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DELETE = exports.dynamic = void 0;
const server_1 = require("next/server");
const prisma_1 = require("@/lib/prisma");
const middleware_1 = require("@/lib/api/middleware");
// Force dynamic rendering - prevents build-time evaluation
exports.dynamic = 'force-dynamic';
exports.DELETE = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        // Get the calendar integration
        const integration = await prisma_1.prisma.calendarIntegration.findUnique({
            where: {
                userId_provider: {
                    userId: context.user.id,
                    provider: 'GOOGLE',
                },
            },
        });
        if (!integration) {
            return server_1.NextResponse.json({ error: 'Calendar integration not found' }, { status: 404 });
        }
        // Revoke the token with Google
        try {
            await fetch(`https://oauth2.googleapis.com/revoke?token=${integration.accessToken}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });
        }
        catch (revokeError) {
            console.error('Failed to revoke Google token:', revokeError);
            // Continue with deletion even if revocation fails
        }
        // Delete the integration
        await prisma_1.prisma.calendarIntegration.delete({
            where: {
                userId_provider: {
                    userId: context.user.id,
                    provider: 'GOOGLE',
                },
            },
        });
        // Create audit log
        await prisma_1.prisma.auditLog.create({
            data: {
                userId: context.user.id,
                userEmail: context.user.email,
                ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
                action: 'DELETE',
                resource: 'CalendarIntegration',
                resourceId: 'GOOGLE',
                success: true,
                details: {
                    provider: 'GOOGLE',
                    calendarEmail: integration.calendarEmail,
                },
            },
        });
        return server_1.NextResponse.json({
            success: true,
            message: 'Google Calendar disconnected successfully',
        });
    }
    catch (error) {
        console.error('Google disconnect error:', error);
        return server_1.NextResponse.json({ error: 'Failed to disconnect Google Calendar', details: error.message }, { status: 500 });
    }
}, {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 10 },
});
//# sourceMappingURL=route.js.map