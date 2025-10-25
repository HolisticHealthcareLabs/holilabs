"use strict";
/**
 * Send OTP API
 *
 * POST /api/portal/auth/otp/send - Send OTP code via SMS or email
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
const rate_limit_1 = require("@/lib/rate-limit");
exports.dynamic = 'force-dynamic';
function generateOTPCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
function hashCode(code) {
    return crypto_1.default.createHash('sha256').update(code).digest('hex');
}
async function sendSMS(phone, code) {
    // TODO: Implement Twilio SMS sending
    console.log(`Would send SMS to ${phone}: Your verification code is ${code}`);
    // Example Twilio implementation:
    /*
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  
    await client.messages.create({
      body: `Your Holi Labs verification code is: ${code}. Valid for 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    */
}
async function sendOTPEmail(email, code) {
    // TODO: Implement email sending
    console.log(`Would send email to ${email}: Your verification code is ${code}`);
}
async function POST(request) {
    // Apply rate limiting - 5 requests per minute for auth endpoints
    const rateLimitResponse = await (0, rate_limit_1.checkRateLimit)(request, 'auth');
    if (rateLimitResponse) {
        return rateLimitResponse;
    }
    try {
        const body = await request.json();
        const { phone, email, channel = 'SMS' } = body;
        // Validate input
        if (!phone && !email) {
            return server_1.NextResponse.json({ error: 'Phone number or email is required' }, { status: 400 });
        }
        // Find patient user
        let patientUser;
        if (phone) {
            patientUser = await prisma_1.prisma.patientUser.findUnique({
                where: { phone },
            });
        }
        else if (email) {
            patientUser = await prisma_1.prisma.patientUser.findUnique({
                where: { email: email.toLowerCase() },
            });
        }
        if (!patientUser) {
            // For security, don't reveal if account exists
            return server_1.NextResponse.json({
                success: true,
                message: 'If an account exists, an OTP code has been sent.'
            }, { status: 200 });
        }
        // Check if MFA is enabled
        if (!patientUser.mfaEnabled) {
            return server_1.NextResponse.json({ error: 'Multi-factor authentication is not enabled for this account' }, { status: 400 });
        }
        // Generate OTP code
        const code = generateOTPCode();
        const codeHash = hashCode(code);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        // Create OTP record
        await prisma_1.prisma.oTPCode.create({
            data: {
                patientUserId: patientUser.id,
                code,
                codeHash,
                expiresAt,
                sentVia: channel,
                recipientPhone: phone,
                recipientEmail: email,
            },
        });
        // Send OTP via selected channel
        try {
            if (channel === 'SMS' && phone) {
                await sendSMS(phone, code);
            }
            else if (channel === 'EMAIL' && email) {
                await sendOTPEmail(email, code);
            }
            else if (channel === 'WHATSAPP' && phone) {
                // TODO: Implement WhatsApp sending
                console.log(`Would send WhatsApp to ${phone}: ${code}`);
            }
        }
        catch (sendError) {
            console.error('Error sending OTP:', sendError);
            return server_1.NextResponse.json({ error: 'Failed to send OTP code' }, { status: 500 });
        }
        return server_1.NextResponse.json({
            success: true,
            message: `OTP code sent via ${channel}`,
            expiresIn: 600, // seconds
        }, { status: 200 });
    }
    catch (error) {
        console.error('Error sending OTP:', error);
        return server_1.NextResponse.json({
            error: 'Failed to send OTP',
            details: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map