/**
 * OTP Authentication System
 *
 * SMS-based One-Time Password for patient authentication backup
 * Features:
 * - 6-digit random codes
 * - SHA-256 hashing for security
 * - 10-minute expiration
 * - 3 attempt limit per code
 * - Rate limiting
 * - Twilio SMS integration
 */

import { createHash, randomInt } from 'crypto';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// Twilio setup
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// OTP configuration
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 3;
const MAX_OTP_PER_PHONE_PER_HOUR = 3;

interface GenerateOTPOptions {
  phone: string;
  channel?: 'SMS' | 'WHATSAPP';
}

interface OTPResult {
  success: boolean;
  code?: string; // Only for development/testing
  expiresAt?: Date;
  error?: string;
}

/**
 * Generate a 6-digit random OTP code
 */
function generateOTPCode(): string {
  // Generate random 6-digit number
  const code = randomInt(100000, 999999).toString();
  return code;
}

/**
 * Hash OTP code using SHA-256
 */
function hashOTPCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

/**
 * Format phone number for Twilio (E.164 format)
 */
function formatPhoneNumber(phone: string): string {
  // Remove any non-digit characters
  let cleaned = phone.replace(/\D/g, '');

  // If it starts with 52 (Mexico), ensure it has +
  if (cleaned.startsWith('52')) {
    return `+${cleaned}`;
  }

  // If it doesn't have country code, assume Mexico (+52)
  if (cleaned.length === 10) {
    return `+52${cleaned}`;
  }

  // Otherwise, add + if not present
  if (!cleaned.startsWith('+')) {
    return `+${cleaned}`;
  }

  return cleaned;
}

/**
 * Check rate limit for phone number
 */
async function checkPhoneRateLimit(phone: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const recentOTPs = await prisma.oTPCode.count({
    where: {
      recipientPhone: phone,
      createdAt: {
        gte: oneHourAgo,
      },
    },
  });

  return recentOTPs < MAX_OTP_PER_PHONE_PER_HOUR;
}

/**
 * Send SMS via Twilio
 */
async function sendSMS(to: string, message: string): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    logger.error({
      event: 'twilio_not_configured',
      message: 'Twilio credentials not set',
    });
    return false;
  }

  try {
    // Twilio REST API call
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

    const formData = new URLSearchParams();
    formData.append('To', to);
    formData.append('From', TWILIO_PHONE_NUMBER);
    formData.append('Body', message);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
          'Basic ' +
          Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      logger.error({
        event: 'twilio_sms_error',
        status: response.status,
        error,
      });
      return false;
    }

    const data = await response.json();
    logger.info({
      event: 'sms_sent',
      messageSid: data.sid,
      to,
    });

    return true;
  } catch (error) {
    logger.error({
      event: 'sms_send_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Generate and send OTP code
 */
export async function generateOTP({
  phone,
  channel = 'SMS',
}: GenerateOTPOptions): Promise<OTPResult> {
  try {
    // Format phone number
    const formattedPhone = formatPhoneNumber(phone);

    // Find patient user by phone
    const patientUser = await prisma.patientUser.findUnique({
      where: { phone: formattedPhone },
      include: {
        patient: true,
      },
    });

    if (!patientUser) {
      // Don't reveal if phone exists (security)
      logger.warn({
        event: 'otp_unknown_phone',
        phone: formattedPhone,
      });
      return {
        success: true, // Return success to prevent phone enumeration
        error: 'Si este teléfono está registrado, recibirás un código pronto.',
      };
    }

    // Check rate limit
    const rateLimitOk = await checkPhoneRateLimit(formattedPhone);
    if (!rateLimitOk) {
      logger.warn({
        event: 'otp_rate_limit',
        phone: formattedPhone,
      });
      return {
        success: false,
        error: 'Demasiados intentos. Por favor, intenta de nuevo en una hora.',
      };
    }

    // Generate OTP code
    const code = generateOTPCode();
    const codeHash = hashOTPCode(code);

    // Calculate expiration
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Invalidate any existing unused OTPs for this user
    await prisma.oTPCode.updateMany({
      where: {
        patientUserId: patientUser.id,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      data: {
        expiresAt: new Date(), // Expire them immediately
      },
    });

    // Store OTP in database
    await prisma.oTPCode.create({
      data: {
        patientUserId: patientUser.id,
        code,
        codeHash,
        expiresAt,
        sentVia: channel,
        recipientPhone: formattedPhone,
        maxAttempts: MAX_ATTEMPTS,
      },
    });

    // Send SMS
    const firstName = patientUser.patient.firstName;
    const message = `Hola ${firstName}, tu código de verificación de Holi Labs es: ${code}\n\nVálido por ${OTP_EXPIRY_MINUTES} minutos. No compartas este código.`;

    const smsSent = await sendSMS(formattedPhone, message);

    if (!smsSent) {
      logger.error({
        event: 'otp_sms_send_failed',
        phone: formattedPhone,
      });
      return {
        success: false,
        error: 'No se pudo enviar el SMS. Por favor, intenta de nuevo.',
      };
    }

    logger.info({
      event: 'otp_generated',
      patientUserId: patientUser.id,
      phone: formattedPhone,
      expiresAt,
    });

    return {
      success: true,
      code: process.env.NODE_ENV === 'development' ? code : undefined, // Only in dev
      expiresAt,
    };
  } catch (error) {
    logger.error({
      event: 'otp_generation_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return {
      success: false,
      error: 'Error al generar código. Por favor, intenta de nuevo.',
    };
  }
}

/**
 * Verify OTP code
 */
export async function verifyOTP(phone: string, code: string): Promise<{
  success: boolean;
  patientUser?: any;
  error?: string;
  attemptsLeft?: number;
}> {
  try {
    const formattedPhone = formatPhoneNumber(phone);
    const codeHash = hashOTPCode(code);

    // Find OTP by hash
    const otpRecord = await prisma.oTPCode.findFirst({
      where: {
        codeHash,
        recipientPhone: formattedPhone,
        usedAt: null,
      },
      include: {
        patientUser: {
          include: {
            patient: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otpRecord) {
      logger.warn({
        event: 'otp_invalid',
        phone: formattedPhone,
      });
      return {
        success: false,
        error: 'Código inválido o expirado.',
      };
    }

    // Check if expired
    if (new Date() > otpRecord.expiresAt) {
      logger.warn({
        event: 'otp_expired',
        patientUserId: otpRecord.patientUserId,
      });
      return {
        success: false,
        error: 'Este código ha expirado. Solicita uno nuevo.',
      };
    }

    // Check attempts
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      logger.warn({
        event: 'otp_max_attempts',
        patientUserId: otpRecord.patientUserId,
      });
      return {
        success: false,
        error: 'Demasiados intentos fallidos. Solicita un nuevo código.',
      };
    }

    // Increment attempts
    await prisma.oTPCode.update({
      where: { id: otpRecord.id },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });

    // Verify code matches
    if (otpRecord.codeHash !== codeHash) {
      const attemptsLeft = otpRecord.maxAttempts - (otpRecord.attempts + 1);
      logger.warn({
        event: 'otp_incorrect',
        patientUserId: otpRecord.patientUserId,
        attemptsLeft,
      });
      return {
        success: false,
        error: `Código incorrecto. ${attemptsLeft} intentos restantes.`,
        attemptsLeft,
      };
    }

    // Mark as used
    await prisma.oTPCode.update({
      where: { id: otpRecord.id },
      data: { usedAt: new Date() },
    });

    // Update patient user last login
    await prisma.patientUser.update({
      where: { id: otpRecord.patientUserId },
      data: {
        lastLoginAt: new Date(),
        phoneVerifiedAt: otpRecord.patientUser.phoneVerifiedAt || new Date(),
        loginAttempts: 0,
      },
    });

    logger.info({
      event: 'otp_verified',
      patientUserId: otpRecord.patientUserId,
      patientId: otpRecord.patientUser.patientId,
    });

    return {
      success: true,
      patientUser: otpRecord.patientUser,
    };
  } catch (error) {
    logger.error({
      event: 'otp_verification_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return {
      success: false,
      error: 'Error al verificar código. Por favor, intenta de nuevo.',
    };
  }
}

/**
 * Clean up expired OTP codes (run via cron job)
 */
export async function cleanupExpiredOTPs(): Promise<number> {
  try {
    const result = await prisma.oTPCode.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    logger.info({
      event: 'otp_cleanup',
      count: result.count,
    });

    return result.count;
  } catch (error) {
    logger.error({
      event: 'otp_cleanup_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return 0;
  }
}
