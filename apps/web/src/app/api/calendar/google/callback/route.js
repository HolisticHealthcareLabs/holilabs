"use strict";
/**
 * Google Calendar OAuth - Callback Handler
 *
 * GET /api/calendar/google/callback?code=xxx&state=userId
 * Exchanges authorization code for access/refresh tokens
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const prisma_1 = require("@/lib/prisma");
const token_encryption_1 = require("@/lib/calendar/token-encryption");
exports.dynamic = 'force-dynamic';
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const state = searchParams.get('state'); // userId
        const error = searchParams.get('error');
        if (error) {
            return server_1.NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/appointments?error=${error}`);
        }
        if (!code || !state) {
            return server_1.NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/appointments?error=missing_params`);
        }
        // Exchange authorization code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/google/callback`,
                grant_type: 'authorization_code',
            }),
        });
        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok) {
            console.error('Google token exchange failed:', tokenData);
            return server_1.NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/appointments?error=token_exchange_failed`);
        }
        // Get user's calendar info
        const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList/primary', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const calendarData = await calendarResponse.json();
        // Get user email from tokeninfo
        const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const userinfo = await userinfoResponse.json();
        // Calculate token expiration
        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
        // Save or update calendar integration
        await prisma_1.prisma.calendarIntegration.upsert({
            where: {
                userId_provider: {
                    userId: state,
                    provider: 'GOOGLE',
                },
            },
            create: {
                userId: state,
                provider: 'GOOGLE',
                providerAccountId: userinfo.id || userinfo.email,
                accessToken: (0, token_encryption_1.encryptToken)(tokenData.access_token),
                refreshToken: tokenData.refresh_token ? (0, token_encryption_1.encryptToken)(tokenData.refresh_token) : null,
                tokenExpiresAt: expiresAt,
                scope: tokenData.scope.split(' '),
                calendarId: calendarData.id || 'primary',
                calendarName: calendarData.summary || 'Primary',
                calendarEmail: userinfo.email,
                lastSyncAt: new Date(),
            },
            update: {
                accessToken: (0, token_encryption_1.encryptToken)(tokenData.access_token),
                refreshToken: tokenData.refresh_token ? (0, token_encryption_1.encryptToken)(tokenData.refresh_token) : undefined,
                tokenExpiresAt: expiresAt,
                scope: tokenData.scope.split(' '),
                calendarId: calendarData.id || 'primary',
                calendarName: calendarData.summary || 'Primary',
                calendarEmail: userinfo.email,
                lastSyncAt: new Date(),
                syncEnabled: true,
                syncErrors: 0,
            },
        });
        // Create audit log
        await prisma_1.prisma.auditLog.create({
            data: {
                userId: state,
                userEmail: userinfo.email,
                ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
                action: 'CREATE',
                resource: 'CalendarIntegration',
                resourceId: 'GOOGLE',
                success: true,
                details: {
                    provider: 'GOOGLE',
                    calendarEmail: userinfo.email,
                },
            },
        });
        return server_1.NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/appointments?success=google_connected`);
    }
    catch (error) {
        console.error('Google OAuth callback error:', error);
        return server_1.NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/appointments?error=callback_failed`);
    }
}
//# sourceMappingURL=route.js.map