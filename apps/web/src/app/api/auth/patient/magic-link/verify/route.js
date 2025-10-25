"use strict";
/**
 * Patient Magic Link Verify API
 *
 * POST /api/auth/patient/magic-link/verify
 * Verify magic link token and create authenticated session
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const zod_1 = require("zod");
const magic_link_1 = require("@/lib/auth/magic-link");
const logger_1 = __importDefault(require("@/lib/logger"));
const jose_1 = require("jose");
const headers_1 = require("next/headers");
// Validation schema
const VerifyMagicLinkSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Token es requerido'),
});
// JWT secret
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || 'fallback-secret');
// Session duration: 7 days
const SESSION_DURATION_DAYS = 7;
/**
 * Create JWT token for patient session
 */
async function createSessionToken(patientUser) {
    const token = await new jose_1.SignJWT({
        userId: patientUser.id,
        patientId: patientUser.patientId,
        email: patientUser.email,
        type: 'patient',
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(`${SESSION_DURATION_DAYS}d`)
        .sign(JWT_SECRET);
    return token;
}
async function POST(request) {
    try {
        // Parse and validate request body
        const body = await request.json();
        const validation = VerifyMagicLinkSchema.safeParse(body);
        if (!validation.success) {
            return server_1.NextResponse.json({
                success: false,
                error: validation.error.errors[0]?.message || 'Datos inválidos',
            }, { status: 400 });
        }
        const { token } = validation.data;
        // Verify magic link
        const result = await (0, magic_link_1.verifyMagicLink)(token);
        if (!result.success || !result.patientUser) {
            return server_1.NextResponse.json({
                success: false,
                error: result.error || 'Enlace inválido o expirado',
            }, { status: 401 });
        }
        // Create session token
        const sessionToken = await createSessionToken(result.patientUser);
        // Set session cookie
        const cookieStore = (0, headers_1.cookies)();
        cookieStore.set('patient-session', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60, // 7 days in seconds
            path: '/',
        });
        logger_1.default.info({
            event: 'patient_login_success',
            patientUserId: result.patientUser.id,
            patientId: result.patientUser.patientId,
            method: 'magic_link',
        });
        // Return success with patient data
        return server_1.NextResponse.json({
            success: true,
            message: 'Inicio de sesión exitoso',
            patient: {
                id: result.patientUser.id,
                patientId: result.patientUser.patientId,
                email: result.patientUser.email,
                firstName: result.patientUser.patient.firstName,
                lastName: result.patientUser.patient.lastName,
                emailVerified: !!result.patientUser.emailVerifiedAt,
            },
        }, { status: 200 });
    }
    catch (error) {
        logger_1.default.error({
            event: 'magic_link_verify_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return server_1.NextResponse.json({
            success: false,
            error: 'Error del servidor. Por favor, intenta de nuevo.',
        }, { status: 500 });
    }
}
/**
 * GET endpoint to verify token from URL query parameter
 * This allows clicking the link directly from email
 */
async function GET(request) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const token = searchParams.get('token');
        if (!token) {
            return server_1.NextResponse.redirect(new URL('/portal/login?error=missing_token', request.url));
        }
        // Verify magic link
        const result = await (0, magic_link_1.verifyMagicLink)(token);
        if (!result.success || !result.patientUser) {
            return server_1.NextResponse.redirect(new URL(`/portal/login?error=${encodeURIComponent(result.error || 'invalid_link')}`, request.url));
        }
        // Create session token
        const sessionToken = await createSessionToken(result.patientUser);
        // Set session cookie
        const cookieStore = (0, headers_1.cookies)();
        cookieStore.set('patient-session', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
            path: '/',
        });
        logger_1.default.info({
            event: 'patient_login_success',
            patientUserId: result.patientUser.id,
            patientId: result.patientUser.patientId,
            method: 'magic_link_get',
        });
        // Redirect to patient portal dashboard
        return server_1.NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }
    catch (error) {
        logger_1.default.error({
            event: 'magic_link_verify_get_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return server_1.NextResponse.redirect(new URL('/portal/login?error=server_error', request.url));
    }
}
//# sourceMappingURL=route.js.map