"use strict";
/**
 * Microsoft Outlook OAuth - Callback Handler
 *
 * GET /api/calendar/microsoft/callback?code=xxx&state=userId
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
        const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: process.env.MICROSOFT_CLIENT_ID || '',
                client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
                redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/microsoft/callback`,
                grant_type: 'authorization_code',
            }),
        });
        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok) {
            console.error('Microsoft token exchange failed:', tokenData);
            return server_1.NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/appointments?error=token_exchange_failed`);
        }
        // Get user's profile info
        const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const profile = await profileResponse.json();
        // Get user's primary calendar
        const calendarResponse = await fetch('https://graph.microsoft.com/v1.0/me/calendar', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const calendar = await calendarResponse.json();
        // Calculate token expiration
        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
        // Save or update calendar integration
        await prisma_1.prisma.calendarIntegration.upsert({
            where: {
                userId_provider: {
                    userId: state,
                    provider: 'MICROSOFT',
                },
            },
            create: {
                userId: state,
                provider: 'MICROSOFT',
                providerAccountId: profile.id,
                accessToken: (0, token_encryption_1.encryptToken)(tokenData.access_token),
                refreshToken: tokenData.refresh_token ? (0, token_encryption_1.encryptToken)(tokenData.refresh_token) : null,
                tokenExpiresAt: expiresAt,
                scope: tokenData.scope.split(' '),
                calendarId: calendar.id || 'primary',
                calendarName: calendar.name || 'Calendar',
                calendarEmail: profile.userPrincipalName || profile.mail,
                lastSyncAt: new Date(),
            },
            update: {
                accessToken: (0, token_encryption_1.encryptToken)(tokenData.access_token),
                refreshToken: tokenData.refresh_token ? (0, token_encryption_1.encryptToken)(tokenData.refresh_token) : undefined,
                tokenExpiresAt: expiresAt,
                scope: tokenData.scope.split(' '),
                calendarId: calendar.id || 'primary',
                calendarName: calendar.name || 'Calendar',
                calendarEmail: profile.userPrincipalName || profile.mail,
                lastSyncAt: new Date(),
                syncEnabled: true,
                syncErrors: 0,
            },
        });
        // Create audit log
        await prisma_1.prisma.auditLog.create({
            data: {
                userId: state,
                userEmail: profile.userPrincipalName || profile.mail,
                ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
                action: 'CREATE',
                resource: 'CalendarIntegration',
                resourceId: 'MICROSOFT',
                success: true,
                details: {
                    provider: 'MICROSOFT',
                    calendarEmail: profile.userPrincipalName || profile.mail,
                },
            },
        });
        return server_1.NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/appointments?success=microsoft_connected`);
    }
    catch (error) {
        console.error('Microsoft OAuth callback error:', error);
        return server_1.NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/appointments?error=callback_failed`);
    }
}
//# sourceMappingURL=route.js.map