"use strict";
/**
 * Google Calendar OAuth - Authorization Initiation
 *
 * GET /api/calendar/google/authorize
 * Redirects user to Google OAuth consent screen
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = void 0;
const server_1 = require("next/server");
const middleware_1 = require("@/lib/api/middleware");
exports.GET = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    const googleOAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleOAuthUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID || '');
    googleOAuthUrl.searchParams.set('redirect_uri', `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/google/callback`);
    googleOAuthUrl.searchParams.set('response_type', 'code');
    googleOAuthUrl.searchParams.set('scope', [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
    ].join(' '));
    googleOAuthUrl.searchParams.set('access_type', 'offline');
    googleOAuthUrl.searchParams.set('prompt', 'consent');
    googleOAuthUrl.searchParams.set('state', context.user.id); // Pass user ID to callback
    return server_1.NextResponse.redirect(googleOAuthUrl.toString());
}, {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    skipCsrf: true,
});
//# sourceMappingURL=route.js.map