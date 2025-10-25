"use strict";
/**
 * Patient OTP Send API
 *
 * POST /api/auth/patient/otp/send
 * Request an OTP code for SMS authentication
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
// Validation schema
const SendOTPSchema = zod_1.z.object({
    phone: zod_1.z.string().min(10, 'Teléfono debe tener al menos 10 dígitos'),
    channel: zod_1.z.enum(['SMS', 'WHATSAPP']).optional().default('SMS'),
});
async function POST(request) {
    try {
        // Parse and validate request body
        const body = await request.json();
        const validation = SendOTPSchema.safeParse(body);
        if (!validation.success) {
            return server_1.NextResponse.json({
                success: false,
                error: validation.error.errors[0]?.message || 'Datos inválidos',
            }, { status: 400 });
        }
        const { phone, channel } = validation.data;
        // Generate and send OTP
        const result = await (0, otp_1.generateOTP)({ phone, channel });
        if (!result.success) {
            return server_1.NextResponse.json({
                success: false,
                error: result.error || 'No se pudo enviar el código.',
            }, { status: 429 } // Too Many Requests if rate limited
            );
        }
        // Return success (with code only in development)
        return server_1.NextResponse.json({
            success: true,
            message: `Código enviado a tu teléfono. Válido por 10 minutos.`,
            expiresAt: result.expiresAt,
            // Only include code in development for testing
            ...(process.env.NODE_ENV === 'development' && result.code
                ? { devCode: result.code }
                : {}),
        }, { status: 200 });
    }
    catch (error) {
        logger_1.default.error({
            event: 'otp_send_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return server_1.NextResponse.json({
            success: false,
            error: 'Error del servidor. Por favor, intenta de nuevo.',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map