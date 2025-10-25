"use strict";
/**
 * Microsoft Outlook OAuth - Authorization Initiation
 *
 * GET /api/calendar/microsoft/authorize
 * Redirects user to Microsoft OAuth consent screen
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = void 0;
const server_1 = require("next/server");
const middleware_1 = require("@/lib/api/middleware");
exports.GET = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    const microsoftOAuthUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    microsoftOAuthUrl.searchParams.set('client_id', process.env.MICROSOFT_CLIENT_ID || '');
    microsoftOAuthUrl.searchParams.set('redirect_uri', `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/microsoft/callback`);
    microsoftOAuthUrl.searchParams.set('response_type', 'code');
    microsoftOAuthUrl.searchParams.set('scope', [
        'https://graph.microsoft.com/Calendars.ReadWrite',
        'https://graph.microsoft.com/User.Read',
        'offline_access',
    ].join(' '));
    microsoftOAuthUrl.searchParams.set('response_mode', 'query');
    microsoftOAuthUrl.searchParams.set('state', context.user.id); // Pass user ID to callback
    return server_1.NextResponse.redirect(microsoftOAuthUrl.toString());
}, {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    skipCsrf: true,
});
//# sourceMappingURL=route.js.map