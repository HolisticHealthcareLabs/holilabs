"use strict";
/**
 * Apple Calendar - CalDAV Connection
 *
 * POST /api/calendar/apple/connect
 * Connects to Apple Calendar using app-specific password
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = exports.dynamic = void 0;
const server_1 = require("next/server");
const prisma_1 = require("@/lib/prisma");
const middleware_1 = require("@/lib/api/middleware");
const token_encryption_1 = require("@/lib/calendar/token-encryption");
// Force dynamic rendering - prevents build-time evaluation
exports.dynamic = 'force-dynamic';
exports.POST = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        const body = await request.json();
        const { appleId, appPassword } = body;
        if (!appleId || !appPassword) {
            return server_1.NextResponse.json({ error: 'Apple ID and app-specific password are required' }, { status: 400 });
        }
        // Validate CalDAV credentials
        // Apple CalDAV server: https://caldav.icloud.com
        const calDavUrl = `https://caldav.icloud.com`;
        const auth = Buffer.from(`${appleId}:${appPassword}`).toString('base64');
        // Test connection to Apple CalDAV server
        const testResponse = await fetch(`${calDavUrl}/`, {
            method: 'PROPFIND',
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/xml; charset=utf-8',
                Depth: '0',
            },
            body: `<?xml version="1.0" encoding="utf-8" ?>
          <D:propfind xmlns:D="DAV:">
            <D:prop>
              <D:displayname />
              <D:resourcetype />
            </D:prop>
          </D:propfind>`,
        });
        if (!testResponse.ok) {
            return server_1.NextResponse.json({
                error: 'Failed to connect to Apple Calendar',
                details: 'Invalid Apple ID or app-specific password',
            }, { status: 401 });
        }
        // Store the connection with encrypted password
        await prisma_1.prisma.calendarIntegration.upsert({
            where: {
                userId_provider: {
                    userId: context.user.id,
                    provider: 'APPLE',
                },
            },
            create: {
                userId: context.user.id,
                provider: 'APPLE',
                providerAccountId: appleId,
                accessToken: (0, token_encryption_1.encryptToken)(appPassword),
                refreshToken: null,
                tokenExpiresAt: null, // App passwords don't expire
                scope: ['caldav'],
                calendarId: 'primary',
                calendarName: 'iCloud Calendar',
                calendarEmail: appleId,
                lastSyncAt: new Date(),
            },
            update: {
                accessToken: (0, token_encryption_1.encryptToken)(appPassword),
                lastSyncAt: new Date(),
                syncEnabled: true,
                syncErrors: 0,
            },
        });
        // Create audit log
        await prisma_1.prisma.auditLog.create({
            data: {
                userId: context.user.id,
                userEmail: context.user.email,
                ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
                action: 'CREATE',
                resource: 'CalendarIntegration',
                resourceId: 'APPLE',
                success: true,
                details: {
                    provider: 'APPLE',
                    calendarEmail: appleId,
                },
            },
        });
        return server_1.NextResponse.json({
            success: true,
            message: 'Apple Calendar connected successfully',
            data: {
                provider: 'APPLE',
                email: appleId,
                connected: true,
            },
        });
    }
    catch (error) {
        console.error('Apple Calendar connect error:', error);
        return server_1.NextResponse.json({ error: 'Failed to connect Apple Calendar', details: error.message }, { status: 500 });
    }
}, {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 10 },
});
//# sourceMappingURL=route.js.map