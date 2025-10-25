"use strict";
/**
 * Next.js Middleware for Authentication, i18n, and Security
 *
 * Protects dashboard routes, manages Supabase sessions, handles locale routing, and applies security headers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.middleware = middleware;
const server_1 = require("next/server");
const middleware_1 = require("@/lib/supabase/middleware");
const security_headers_1 = require("@/lib/security-headers");
const i18n_1 = require("../i18n");
function getLocale(request) {
    // Check if locale is in the pathname
    const pathname = request.nextUrl.pathname;
    const pathnameLocale = i18n_1.locales.find((locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`);
    if (pathnameLocale)
        return pathnameLocale;
    // Check cookie
    const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;
    if (localeCookie && i18n_1.locales.includes(localeCookie)) {
        return localeCookie;
    }
    // Check Accept-Language header
    const acceptLanguage = request.headers.get('accept-language');
    if (acceptLanguage) {
        const browserLocale = acceptLanguage.split(',')[0].split('-')[0];
        if (i18n_1.locales.includes(browserLocale)) {
            return browserLocale;
        }
    }
    return i18n_1.defaultLocale;
}
async function middleware(request) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
        return (0, security_headers_1.handleCORSPreflight)();
    }
    const pathname = request.nextUrl.pathname;
    // Skip locale handling for API routes, static files, auth, portal, dashboard, etc.
    if (pathname.startsWith('/api') ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/auth') ||
        pathname.startsWith('/portal') ||
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/shared') ||
        pathname === '/' ||
        pathname.includes('.')) {
        const response = await (0, middleware_1.updateSession)(request);
        return (0, security_headers_1.applySecurityHeaders)(response);
    }
    // Check if pathname has a locale
    const pathnameHasLocale = i18n_1.locales.some((locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`);
    // Redirect if no locale in pathname
    if (!pathnameHasLocale) {
        const locale = getLocale(request);
        const newUrl = new URL(`/${locale}${pathname}`, request.url);
        return server_1.NextResponse.redirect(newUrl);
    }
    // Update session and get response
    const response = await (0, middleware_1.updateSession)(request);
    // Apply security headers to all responses
    return (0, security_headers_1.applySecurityHeaders)(response);
}
exports.config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         * - Files with extensions (images, etc.)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
    ],
};
//# sourceMappingURL=middleware.js.map