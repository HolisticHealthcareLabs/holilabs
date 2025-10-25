"use strict";
/**
 * CSRF Token API
 *
 * GET /api/csrf - Generate and return a CSRF token
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const csrf_1 = require("@/lib/security/csrf");
// Force dynamic rendering - don't try to generate at build time
exports.dynamic = 'force-dynamic';
async function GET() {
    const token = (0, csrf_1.generateCsrfToken)();
    const response = server_1.NextResponse.json({
        success: true,
        token,
    });
    // Set CSRF token in cookie (double-submit pattern)
    response.cookies.set('csrf-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
    });
    return response;
}
//# sourceMappingURL=route.js.map