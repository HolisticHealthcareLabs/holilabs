"use strict";
/**
 * Send Magic Link API
 *
 * POST /api/portal/auth/magic-link/send - Send magic link to patient email
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.POST = POST;
const server_1 = require("next/server");
const prisma_1 = require("@/lib/prisma");
const crypto_1 = __importDefault(require("crypto"));
const email_1 = require("@/lib/email");
const rate_limit_1 = require("@/lib/rate-limit");
exports.dynamic = 'force-dynamic';
function generateToken() {
    return crypto_1.default.randomBytes(32).toString('hex');
}
function hashToken(token) {
    return crypto_1.default.createHash('sha256').update(token).digest('hex');
}
async function POST(request) {
    // Apply rate limiting - 5 requests per minute for auth endpoints
    const rateLimitResponse = await (0, rate_limit_1.checkRateLimit)(request, 'auth');
    if (rateLimitResponse) {
        return rateLimitResponse;
    }
    try {
        const body = await request.json();
        const { email } = body;
        // Validate email
        if (!email || !email.includes('@')) {
            return server_1.NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
        }
        // Find patient user by email
        const patientUser = await prisma_1.prisma.patientUser.findUnique({
            where: { email: email.toLowerCase() },
            include: {
                patient: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
        if (!patientUser) {
            // For security, don't reveal if email exists
            return server_1.NextResponse.json({
                success: true,
                message: 'If an account exists with this email, a magic link has been sent.'
            }, { status: 200 });
        }
        // Generate magic link token
        const token = generateToken();
        const tokenHash = hashToken(token);
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        // Create magic link record
        await prisma_1.prisma.magicLink.create({
            data: {
                patientUserId: patientUser.id,
                token,
                tokenHash,
                expiresAt,
                ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
                userAgent: request.headers.get('user-agent') || 'unknown',
            },
        });
        // Build magic link URL
        const magicLinkUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/portal/auth/verify?token=${token}`;
        // Send email with magic link
        try {
            await (0, email_1.sendMagicLinkEmail)(patientUser.email, `${patientUser.patient.firstName} ${patientUser.patient.lastName}`, magicLinkUrl, expiresAt);
        }
        catch (emailError) {
            console.error('Error sending magic link email:', emailError);
            return server_1.NextResponse.json({ error: 'Failed to send magic link email' }, { status: 500 });
        }
        return server_1.NextResponse.json({
            success: true,
            message: 'Magic link sent to your email. Please check your inbox.'
        }, { status: 200 });
    }
    catch (error) {
        console.error('Error sending magic link:', error);
        return server_1.NextResponse.json({
            error: 'Failed to send magic link',
            details: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map