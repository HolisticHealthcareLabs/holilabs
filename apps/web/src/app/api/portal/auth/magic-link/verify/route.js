"use strict";
/**
 * Verify Magic Link API
 *
 * POST /api/portal/auth/magic-link/verify - Verify magic link token and create session
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
const patient_session_1 = require("@/lib/auth/patient-session");
exports.dynamic = 'force-dynamic';
function hashToken(token) {
    return crypto_1.default.createHash('sha256').update(token).digest('hex');
}
async function POST(request) {
    try {
        const body = await request.json();
        const { token } = body;
        if (!token) {
            return server_1.NextResponse.json({ error: 'Token is required' }, { status: 400 });
        }
        // Hash the token to lookup in database
        const tokenHash = hashToken(token);
        // Find magic link
        const magicLink = await prisma_1.prisma.magicLink.findUnique({
            where: { tokenHash },
            include: {
                patientUser: {
                    include: {
                        patient: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                mrn: true,
                            },
                        },
                    },
                },
            },
        });
        if (!magicLink) {
            return server_1.NextResponse.json({ error: 'Invalid or expired magic link' }, { status: 401 });
        }
        // Check if already used
        if (magicLink.usedAt) {
            return server_1.NextResponse.json({ error: 'Magic link has already been used' }, { status: 401 });
        }
        // Check if expired
        if (new Date() > new Date(magicLink.expiresAt)) {
            return server_1.NextResponse.json({ error: 'Magic link has expired' }, { status: 401 });
        }
        // Mark magic link as used
        await prisma_1.prisma.magicLink.update({
            where: { id: magicLink.id },
            data: { usedAt: new Date() },
        });
        // Update patient user last login
        await prisma_1.prisma.patientUser.update({
            where: { id: magicLink.patientUserId },
            data: {
                lastLoginAt: new Date(),
                lastLoginIp: request.headers.get('x-forwarded-for') || 'unknown',
                emailVerifiedAt: magicLink.patientUser.emailVerifiedAt || new Date(),
                loginAttempts: 0, // Reset login attempts on successful login
            },
        });
        // Create patient session with JWT
        await (0, patient_session_1.createPatientSession)(magicLink.patientUser.id, magicLink.patientUser.patient.id, magicLink.patientUser.email, false // rememberMe = false for magic links
        );
        return server_1.NextResponse.json({
            success: true,
            patient: {
                id: magicLink.patientUser.patient.id,
                firstName: magicLink.patientUser.patient.firstName,
                lastName: magicLink.patientUser.patient.lastName,
                mrn: magicLink.patientUser.patient.mrn,
            },
        }, { status: 200 });
    }
    catch (error) {
        console.error('Error verifying magic link:', error);
        return server_1.NextResponse.json({
            error: 'Failed to verify magic link',
            details: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map