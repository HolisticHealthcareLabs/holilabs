"use strict";
/**
 * Patient OTP Verify API
 *
 * POST /api/auth/patient/otp/verify
 * Verify OTP code and create authenticated session
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const zod_1 = require("zod");
const otp_1 = require("@/lib/auth/otp");
const logger_1 = __importDefault(require("@/lib/logger"));
const jose_1 = require("jose");
const headers_1 = require("next/headers");
// Validation schema
const VerifyOTPSchema = zod_1.z.object({
    phone: zod_1.z.string().min(10, 'Teléfono inválido'),
    code: zod_1.z.string().length(6, 'Código debe tener 6 dígitos'),
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
        const validation = VerifyOTPSchema.safeParse(body);
        if (!validation.success) {
            return server_1.NextResponse.json({
                success: false,
                error: validation.error.errors[0]?.message || 'Datos inválidos',
            }, { status: 400 });
        }
        const { phone, code } = validation.data;
        // Verify OTP
        const result = await (0, otp_1.verifyOTP)(phone, code);
        if (!result.success || !result.patientUser) {
            return server_1.NextResponse.json({
                success: false,
                error: result.error || 'Código inválido',
                attemptsLeft: result.attemptsLeft,
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
            method: 'otp',
        });
        // Return success with patient data
        return server_1.NextResponse.json({
            success: true,
            message: 'Inicio de sesión exitoso',
            patient: {
                id: result.patientUser.id,
                patientId: result.patientUser.patientId,
                email: result.patientUser.email,
                phone: result.patientUser.phone,
                firstName: result.patientUser.patient.firstName,
                lastName: result.patientUser.patient.lastName,
                phoneVerified: !!result.patientUser.phoneVerifiedAt,
            },
        }, { status: 200 });
    }
    catch (error) {
        logger_1.default.error({
            event: 'otp_verify_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return server_1.NextResponse.json({
            success: false,
            error: 'Error del servidor. Por favor, intenta de nuevo.',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map