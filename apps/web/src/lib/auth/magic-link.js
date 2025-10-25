"use strict";
/**
 * Magic Link Authentication System
 *
 * Industry-grade passwordless authentication for patients
 * Features:
 * - Crypto-secure token generation
 * - SHA-256 token hashing
 * - Time-based expiration (15 minutes)
 * - Single-use tokens
 * - IP address tracking
 * - Rate limiting protection
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMagicLink = generateMagicLink;
exports.sendMagicLinkEmail = sendMagicLinkEmail;
exports.verifyMagicLink = verifyMagicLink;
exports.cleanupExpiredMagicLinks = cleanupExpiredMagicLinks;
const crypto_1 = require("crypto");
const prisma_1 = require("@/lib/prisma");
const resend_1 = require("resend");
const logger_1 = __importDefault(require("@/lib/logger"));
const resend = new resend_1.Resend(process.env.RESEND_API_KEY);
// Magic link expiration: 15 minutes
const MAGIC_LINK_EXPIRY_MINUTES = 15;
// Rate limits
const MAX_LINKS_PER_EMAIL_PER_HOUR = 3;
const MAX_LINKS_PER_IP_PER_HOUR = 10;
/**
 * Generate a cryptographically secure random token
 */
function generateSecureToken() {
    // Generate 32 random bytes (256 bits) and convert to URL-safe base64
    return (0, crypto_1.randomBytes)(32).toString('base64url');
}
/**
 * Hash a token using SHA-256
 */
function hashToken(token) {
    return (0, crypto_1.createHash)('sha256').update(token).digest('hex');
}
/**
 * Check if email has exceeded rate limit
 */
async function checkEmailRateLimit(email) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentLinks = await prisma_1.prisma.magicLink.count({
        where: {
            patientUser: {
                email,
            },
            createdAt: {
                gte: oneHourAgo,
            },
        },
    });
    return recentLinks < MAX_LINKS_PER_EMAIL_PER_HOUR;
}
/**
 * Check if IP has exceeded rate limit
 */
async function checkIpRateLimit(ipAddress) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentLinks = await prisma_1.prisma.magicLink.count({
        where: {
            ipAddress,
            createdAt: {
                gte: oneHourAgo,
            },
        },
    });
    return recentLinks < MAX_LINKS_PER_IP_PER_HOUR;
}
/**
 * Generate and store a magic link for patient authentication
 */
async function generateMagicLink({ email, ipAddress, userAgent, }) {
    try {
        // Find patient user by email
        const patientUser = await prisma_1.prisma.patientUser.findUnique({
            where: { email },
            include: {
                patient: true,
            },
        });
        if (!patientUser) {
            // Don't reveal if email exists or not (security best practice)
            logger_1.default.warn({
                event: 'magic_link_unknown_email',
                email,
                ipAddress,
            });
            return {
                success: true, // Return success to prevent email enumeration
                error: 'If this email is registered, a magic link has been sent.',
            };
        }
        // Check rate limits
        const emailRateLimitOk = await checkEmailRateLimit(email);
        if (!emailRateLimitOk) {
            logger_1.default.warn({
                event: 'magic_link_rate_limit_email',
                email,
                ipAddress,
            });
            return {
                success: false,
                error: 'Too many login attempts. Please try again in an hour.',
            };
        }
        if (ipAddress) {
            const ipRateLimitOk = await checkIpRateLimit(ipAddress);
            if (!ipRateLimitOk) {
                logger_1.default.warn({
                    event: 'magic_link_rate_limit_ip',
                    ipAddress,
                });
                return {
                    success: false,
                    error: 'Too many login attempts from this location. Please try again in an hour.',
                };
            }
        }
        // Generate secure token
        const token = generateSecureToken();
        const tokenHash = hashToken(token);
        // Calculate expiration
        const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000);
        // Store magic link in database
        await prisma_1.prisma.magicLink.create({
            data: {
                patientUserId: patientUser.id,
                token,
                tokenHash,
                expiresAt,
                ipAddress,
                userAgent,
            },
        });
        // Generate magic link URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const magicLinkUrl = `${baseUrl}/portal/auth/verify?token=${token}`;
        logger_1.default.info({
            event: 'magic_link_generated',
            patientUserId: patientUser.id,
            patientId: patientUser.patientId,
            expiresAt,
        });
        return {
            success: true,
            token,
            magicLinkUrl,
            expiresAt,
        };
    }
    catch (error) {
        logger_1.default.error({
            event: 'magic_link_generation_error',
            error: error instanceof Error ? error.message : 'Unknown error',
            email,
        });
        return {
            success: false,
            error: 'Failed to generate magic link. Please try again.',
        };
    }
}
/**
 * Send magic link via email
 */
async function sendMagicLinkEmail(email, magicLinkUrl, patientName) {
    try {
        const response = await resend.emails.send({
            from: 'Holi Labs <noreply@holilabs.com>',
            to: email,
            subject: 'Tu enlace de inicio de sesión - Holi Labs',
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Inicio de Sesión</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🌿 Holi Labs</h1>
          </div>

          <div style="background: white; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #111827; margin-top: 0;">Hola${patientName ? ` ${patientName}` : ''},</h2>

            <p style="font-size: 16px; color: #4b5563;">
              Has solicitado iniciar sesión en tu portal de paciente de Holi Labs.
            </p>

            <div style="text-align: center; margin: 35px 0;">
              <a href="${magicLinkUrl}"
                 style="background: linear-gradient(135deg, #10B981 0%, #059669 100%);
                        color: white;
                        padding: 16px 32px;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: 600;
                        font-size: 16px;
                        display: inline-block;
                        box-shadow: 0 4px 6px rgba(16, 185, 129, 0.25);">
                ✨ Iniciar Sesión de Forma Segura
              </a>
            </div>

            <div style="background: #f9fafb; border-left: 4px solid #10B981; padding: 16px; margin: 25px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                <strong style="color: #059669;">🔒 Seguridad:</strong> Este enlace expira en 15 minutos y solo puede usarse una vez.
              </p>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              Si no solicitaste este enlace, puedes ignorar este correo de forma segura.
            </p>

            <p style="font-size: 14px; color: #6b7280;">
              ¿Problemas con el botón? Copia y pega este enlace en tu navegador:<br>
              <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 12px; word-break: break-all;">${magicLinkUrl}</code>
            </p>
          </div>

          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p style="margin: 5px 0;">Holi Labs - Tu salud, tu control</p>
            <p style="margin: 5px 0;">📧 <a href="mailto:support@holilabs.com" style="color: #10B981; text-decoration: none;">support@holilabs.com</a></p>
          </div>
        </body>
        </html>
      `,
        });
        if (response.error) {
            logger_1.default.error({
                event: 'magic_link_email_error',
                error: response.error,
                email,
            });
            return false;
        }
        logger_1.default.info({
            event: 'magic_link_email_sent',
            email,
            messageId: response.data?.id,
        });
        return true;
    }
    catch (error) {
        logger_1.default.error({
            event: 'magic_link_email_send_error',
            error: error instanceof Error ? error.message : 'Unknown error',
            email,
        });
        return false;
    }
}
/**
 * Verify magic link token and return patient user
 */
async function verifyMagicLink(token) {
    try {
        const tokenHash = hashToken(token);
        // Find magic link by token hash
        const magicLink = await prisma_1.prisma.magicLink.findUnique({
            where: { tokenHash },
            include: {
                patientUser: {
                    include: {
                        patient: true,
                    },
                },
            },
        });
        if (!magicLink) {
            logger_1.default.warn({
                event: 'magic_link_invalid',
            });
            return {
                success: false,
                error: 'Enlace inválido o expirado.',
            };
        }
        // Check if already used
        if (magicLink.usedAt) {
            logger_1.default.warn({
                event: 'magic_link_already_used',
                patientUserId: magicLink.patientUserId,
            });
            return {
                success: false,
                error: 'Este enlace ya ha sido utilizado.',
            };
        }
        // Check if expired
        if (new Date() > magicLink.expiresAt) {
            logger_1.default.warn({
                event: 'magic_link_expired',
                patientUserId: magicLink.patientUserId,
            });
            return {
                success: false,
                error: 'Este enlace ha expirado. Solicita uno nuevo.',
            };
        }
        // Mark as used
        await prisma_1.prisma.magicLink.update({
            where: { id: magicLink.id },
            data: { usedAt: new Date() },
        });
        // Update last login
        await prisma_1.prisma.patientUser.update({
            where: { id: magicLink.patientUserId },
            data: {
                lastLoginAt: new Date(),
                emailVerifiedAt: magicLink.patientUser.emailVerifiedAt || new Date(),
                loginAttempts: 0,
            },
        });
        logger_1.default.info({
            event: 'magic_link_verified',
            patientUserId: magicLink.patientUserId,
            patientId: magicLink.patientUser.patientId,
        });
        return {
            success: true,
            patientUser: magicLink.patientUser,
        };
    }
    catch (error) {
        logger_1.default.error({
            event: 'magic_link_verification_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return {
            success: false,
            error: 'Error al verificar el enlace. Por favor, intenta de nuevo.',
        };
    }
}
/**
 * Clean up expired magic links (run via cron job)
 */
async function cleanupExpiredMagicLinks() {
    try {
        const result = await prisma_1.prisma.magicLink.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date(),
                },
            },
        });
        logger_1.default.info({
            event: 'magic_links_cleaned_up',
            count: result.count,
        });
        return result.count;
    }
    catch (error) {
        logger_1.default.error({
            event: 'magic_link_cleanup_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return 0;
    }
}
//# sourceMappingURL=magic-link.js.map