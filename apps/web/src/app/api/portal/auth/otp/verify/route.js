"use strict";
/**
 * Verify OTP API
 *
 * POST /api/portal/auth/otp/verify - Verify OTP code
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
exports.dynamic = 'force-dynamic';
function hashCode(code) {
    return crypto_1.default.createHash('sha256').update(code).digest('hex');
}
async function POST(request) {
    try {
        const body = await request.json();
        const { code, phone, email } = body;
        if (!code) {
            return server_1.NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
        }
        if (!phone && !email) {
            return server_1.NextResponse.json({ error: 'Phone number or email is required' }, { status: 400 });
        }
        // Hash the code
        const codeHash = hashCode(code);
        // Find the OTP record
        const otpRecord = await prisma_1.prisma.oTPCode.findUnique({
            where: { codeHash },
            include: {
                patientUser: {
                    include: {
                        patient: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
            },
        });
        if (!otpRecord) {
            return server_1.NextResponse.json({ error: 'Invalid verification code' }, { status: 401 });
        }
        // Check if already used
        if (otpRecord.usedAt) {
            return server_1.NextResponse.json({ error: 'Verification code has already been used' }, { status: 401 });
        }
        // Check if expired
        if (new Date() > new Date(otpRecord.expiresAt)) {
            return server_1.NextResponse.json({ error: 'Verification code has expired' }, { status: 401 });
        }
        // Check if max attempts exceeded
        if (otpRecord.attempts >= otpRecord.maxAttempts) {
            return server_1.NextResponse.json({ error: 'Maximum verification attempts exceeded. Please request a new code.' }, { status: 401 });
        }
        // Verify the recipient matches
        const recipientMatches = (phone && otpRecord.recipientPhone === phone) ||
            (email && otpRecord.recipientEmail === email);
        if (!recipientMatches) {
            // Increment attempts
            await prisma_1.prisma.oTPCode.update({
                where: { id: otpRecord.id },
                data: { attempts: { increment: 1 } },
            });
            return server_1.NextResponse.json({ error: 'Invalid verification code' }, { status: 401 });
        }
        // Mark OTP as used
        await prisma_1.prisma.oTPCode.update({
            where: { id: otpRecord.id },
            data: {
                usedAt: new Date(),
                attempts: { increment: 1 },
            },
        });
        // Update phone verified status if SMS
        if (phone && otpRecord.sentVia === 'SMS') {
            await prisma_1.prisma.patientUser.update({
                where: { id: otpRecord.patientUserId },
                data: { phoneVerifiedAt: new Date() },
            });
        }
        // Update email verified status if EMAIL
        if (email && otpRecord.sentVia === 'EMAIL') {
            await prisma_1.prisma.patientUser.update({
                where: { id: otpRecord.patientUserId },
                data: { emailVerifiedAt: new Date() },
            });
        }
        return server_1.NextResponse.json({
            success: true,
            message: 'Verification successful',
            patient: {
                id: otpRecord.patientUser.patient.id,
                firstName: otpRecord.patientUser.patient.firstName,
                lastName: otpRecord.patientUser.patient.lastName,
            },
        }, { status: 200 });
    }
    catch (error) {
        console.error('Error verifying OTP:', error);
        return server_1.NextResponse.json({
            error: 'Failed to verify OTP',
            details: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map