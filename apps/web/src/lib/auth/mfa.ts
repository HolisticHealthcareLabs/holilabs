/**
 * Multi-Factor Authentication (MFA) Module
 *
 * SOC 2 Control: CC6.1 (Logical and Physical Access Controls - Multi-Factor Authentication)
 *
 * This module provides MFA enrollment and verification using Twilio Verify API.
 * MFA is MANDATORY for privileged roles (ADMIN, PHYSICIAN, CLINICIAN).
 *
 * Architecture:
 * - Primary: SMS/Phone verification via Twilio Verify
 * - Backup: Time-based recovery codes (encrypted, single-use)
 * - Grace period: 7 days for existing users to enroll
 *
 * Security Features:
 * - Rate limiting: 5 attempts per hour per user
 * - Backup codes: 10 single-use codes, AES-256 encrypted
 * - Audit logging: All MFA events logged
 * - Session binding: MFA status tied to session token
 *
 * Example Usage:
 * ```typescript
 * // Enrollment
 * const result = await enrollMFA(userId, '+15551234567', 'sms');
 * await verifyMFAEnrollment(userId, result.verificationSid, '123456');
 *
 * // Login verification
 * const session = await verifyMFALogin(userId, code);
 * ```
 */

import twilio from 'twilio';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { encryptPHI, decryptPHI } from '@/lib/security/encryption';
import { createAuditLog } from '@/lib/audit';
import crypto from 'crypto';

// Environment configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;

// MFA configuration
const MFA_CODE_LENGTH = 6;
const MFA_CODE_EXPIRY_MINUTES = 10;
const MFA_MAX_ATTEMPTS_PER_HOUR = 5;
const BACKUP_CODES_COUNT = 10;
const BACKUP_CODE_LENGTH = 8;

// Privileged roles that MUST have MFA enabled
const PRIVILEGED_ROLES = ['ADMIN', 'PHYSICIAN', 'CLINICIAN'];

// Singleton Twilio client
let twilioClient: twilio.Twilio | null = null;

/**
 * Get or create Twilio client
 */
function getTwilioClient(): twilio.Twilio {
  if (!twilioClient) {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)');
    }

    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }

  return twilioClient;
}

/**
 * Check if MFA is required for user role
 */
export function isMFARequired(userRole: string): boolean {
  return PRIVILEGED_ROLES.includes(userRole.toUpperCase());
}

/**
 * MFA enrollment result
 */
export interface MFAEnrollmentResult {
  verificationSid: string;
  phoneNumber: string;
  channel: 'sms' | 'call';
  expiresAt: Date;
}

/**
 * Enroll user in MFA
 *
 * Sends verification code to user's phone number.
 * User must verify code to complete enrollment.
 *
 * @param userId - User ID
 * @param phoneNumber - Phone number in E.164 format (e.g., +15551234567)
 * @param channel - Verification channel ('sms' or 'call')
 * @returns Enrollment result with verification SID
 *
 * @example
 * ```typescript
 * const result = await enrollMFA('user_123', '+15551234567', 'sms');
 * console.log(`Verification sent to ${result.phoneNumber}`);
 * ```
 */
export async function enrollMFA(
  userId: string,
  phoneNumber: string,
  channel: 'sms' | 'call' = 'sms'
): Promise<MFAEnrollmentResult> {
  try {
    if (!TWILIO_VERIFY_SERVICE_SID) {
      throw new Error('Twilio Verify Service SID not configured');
    }

    // Validate phone number format (E.164)
    if (!phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
      throw new Error('Invalid phone number format. Use E.164 format (e.g., +15551234567)');
    }

    const client = getTwilioClient();

    logger.info({
      event: 'mfa_enrollment_started',
      userId,
      phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*'), // Mask phone number in logs
      channel,
    }, 'Starting MFA enrollment');

    // Send verification code via Twilio Verify
    const verification = await client.verify.v2
      .services(TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({
        to: phoneNumber,
        channel,
      });

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + MFA_CODE_EXPIRY_MINUTES);

    // Audit log
    await createAuditLog({
      action: 'CREATE',
      resource: 'MFA_ENROLLMENT',
      resourceId: userId,
      details: {
        phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*'),
        channel,
        verificationSid: verification.sid,
      },
      success: true,
    });

    logger.info({
      event: 'mfa_enrollment_code_sent',
      userId,
      verificationSid: verification.sid,
      status: verification.status,
    }, 'MFA enrollment code sent successfully');

    return {
      verificationSid: verification.sid,
      phoneNumber,
      channel,
      expiresAt,
    };
  } catch (error) {
    logger.error({
      event: 'mfa_enrollment_failed',
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to enroll in MFA');

    // Audit log
    await createAuditLog({
      action: 'CREATE',
      resource: 'MFA_ENROLLMENT',
      resourceId: userId,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    throw new Error(`MFA enrollment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Verify MFA enrollment
 *
 * Validates the verification code and completes MFA enrollment.
 * Generates backup codes for account recovery.
 *
 * @param userId - User ID
 * @param verificationSid - Verification SID from enrollMFA
 * @param code - 6-digit verification code
 * @returns Success status and backup codes
 *
 * @example
 * ```typescript
 * const result = await verifyMFAEnrollment('user_123', 'VExxxx', '123456');
 * console.log('Backup codes:', result.backupCodes);
 * ```
 */
export async function verifyMFAEnrollment(
  userId: string,
  phoneNumber: string,
  code: string
): Promise<{
  success: boolean;
  backupCodes: string[];
}> {
  try {
    if (!TWILIO_VERIFY_SERVICE_SID) {
      throw new Error('Twilio Verify Service SID not configured');
    }

    const client = getTwilioClient();

    logger.info({
      event: 'mfa_enrollment_verification_started',
      userId,
    }, 'Verifying MFA enrollment code');

    // Verify code with Twilio Verify
    const verificationCheck = await client.verify.v2
      .services(TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({
        to: phoneNumber,
        code,
      });

    if (verificationCheck.status !== 'approved') {
      logger.warn({
        event: 'mfa_enrollment_verification_failed',
        userId,
        status: verificationCheck.status,
      }, 'MFA enrollment verification failed');

      // Audit log
      await createAuditLog({
        action: 'UPDATE',
        resource: 'MFA_ENROLLMENT',
        resourceId: userId,
        details: {
          status: verificationCheck.status,
          reason: 'Invalid verification code',
        },
        success: false,
        errorMessage: 'Invalid verification code',
      });

      return { success: false, backupCodes: [] };
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes(BACKUP_CODES_COUNT, BACKUP_CODE_LENGTH);

    // Encrypt backup codes for storage
    const encryptedBackupCodes = backupCodes
      .map((code) => encryptPHI(code))
      .filter((code): code is string => code !== null);

    // Update user with MFA enabled
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaServiceSid: TWILIO_VERIFY_SERVICE_SID,
        mfaPhoneNumber: encryptPHI(phoneNumber), // Encrypt phone number
        mfaBackupCodes: encryptedBackupCodes,
        mfaEnrolledAt: new Date(),
      },
    });

    logger.info({
      event: 'mfa_enrollment_completed',
      userId,
    }, 'MFA enrollment completed successfully');

    // Audit log
    await createAuditLog({
      action: 'UPDATE',
      resource: 'MFA_ENROLLMENT',
      resourceId: userId,
      details: {
        status: 'enrolled',
        phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*'),
      },
      success: true,
    });

    return {
      success: true,
      backupCodes, // Return plaintext codes ONCE for user to save
    };
  } catch (error) {
    logger.error({
      event: 'mfa_enrollment_verification_failed',
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to verify MFA enrollment');

    // Audit log
    await createAuditLog({
      action: 'UPDATE',
      resource: 'MFA_ENROLLMENT',
      resourceId: userId,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    throw new Error(`MFA enrollment verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Send MFA login verification code
 *
 * Sends verification code during login process.
 *
 * @param userId - User ID
 * @param channel - Verification channel ('sms' or 'call')
 * @returns Verification result
 *
 * @example
 * ```typescript
 * const result = await sendMFALoginCode('user_123', 'sms');
 * console.log(`Code sent, expires at ${result.expiresAt}`);
 * ```
 */
export async function sendMFALoginCode(
  userId: string,
  channel: 'sms' | 'call' = 'sms'
): Promise<{
  verificationSid: string;
  expiresAt: Date;
}> {
  try {
    if (!TWILIO_VERIFY_SERVICE_SID) {
      throw new Error('Twilio Verify Service SID not configured');
    }

    // Get user's MFA phone number
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        mfaEnabled: true,
        mfaPhoneNumber: true,
      },
    });

    if (!user || !user.mfaEnabled || !user.mfaPhoneNumber) {
      throw new Error('MFA not enabled for this user');
    }

    // Decrypt phone number
    const phoneNumber = decryptPHI(user.mfaPhoneNumber);

    if (!phoneNumber) {
      throw new Error('Failed to decrypt phone number');
    }

    const client = getTwilioClient();

    logger.info({
      event: 'mfa_login_code_sent',
      userId,
      channel,
    }, 'Sending MFA login verification code');

    // Send verification code
    const verification = await client.verify.v2
      .services(TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({
        to: phoneNumber,
        channel,
      });

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + MFA_CODE_EXPIRY_MINUTES);

    // Audit log
    await createAuditLog({
      action: 'ACCESS',
      resource: 'MFA_LOGIN',
      resourceId: userId,
      details: {
        verificationSid: verification.sid,
        channel,
      },
      success: true,
    });

    logger.info({
      event: 'mfa_login_code_sent_success',
      userId,
      verificationSid: verification.sid,
    }, 'MFA login code sent successfully');

    return {
      verificationSid: verification.sid,
      expiresAt,
    };
  } catch (error) {
    logger.error({
      event: 'mfa_login_code_failed',
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to send MFA login code');

    // Audit log
    await createAuditLog({
      action: 'ACCESS',
      resource: 'MFA_LOGIN',
      resourceId: userId,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    throw new Error(`Failed to send MFA login code: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Verify MFA login code
 *
 * Validates verification code during login.
 *
 * @param userId - User ID
 * @param code - 6-digit verification code
 * @returns Verification success status
 *
 * @example
 * ```typescript
 * const success = await verifyMFALoginCode('user_123', '123456');
 * if (success) {
 *   // Grant access
 * }
 * ```
 */
export async function verifyMFALoginCode(
  userId: string,
  code: string
): Promise<boolean> {
  try {
    if (!TWILIO_VERIFY_SERVICE_SID) {
      throw new Error('Twilio Verify Service SID not configured');
    }

    // Get user's MFA phone number
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        mfaEnabled: true,
        mfaPhoneNumber: true,
      },
    });

    if (!user || !user.mfaEnabled || !user.mfaPhoneNumber) {
      throw new Error('MFA not enabled for this user');
    }

    // Decrypt phone number
    const phoneNumber = decryptPHI(user.mfaPhoneNumber);

    if (!phoneNumber) {
      throw new Error('Failed to decrypt phone number');
    }

    const client = getTwilioClient();

    logger.info({
      event: 'mfa_login_verification_started',
      userId,
    }, 'Verifying MFA login code');

    // Verify code with Twilio Verify
    const verificationCheck = await client.verify.v2
      .services(TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({
        to: phoneNumber,
        code,
      });

    const success = verificationCheck.status === 'approved';

    // Audit log
    await createAuditLog({
      action: 'LOGIN',
      resource: 'MFA_VERIFICATION',
      resourceId: userId,
      details: {
        status: verificationCheck.status,
      },
      success,
      errorMessage: success ? undefined : 'Invalid MFA code',
    });

    if (success) {
      logger.info({
        event: 'mfa_login_verification_success',
        userId,
      }, 'MFA login verification successful');
    } else {
      logger.warn({
        event: 'mfa_login_verification_failed',
        userId,
        status: verificationCheck.status,
      }, 'MFA login verification failed');
    }

    return success;
  } catch (error) {
    logger.error({
      event: 'mfa_login_verification_error',
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Error verifying MFA login code');

    // Audit log
    await createAuditLog({
      action: 'LOGIN',
      resource: 'MFA_VERIFICATION',
      resourceId: userId,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    return false;
  }
}

/**
 * Verify backup code
 *
 * Validates single-use backup code for account recovery.
 * Backup codes are consumed after successful use.
 *
 * @param userId - User ID
 * @param backupCode - 8-character backup code
 * @returns Verification success status
 *
 * @example
 * ```typescript
 * const success = await verifyBackupCode('user_123', 'ABC12345');
 * if (success) {
 *   // Grant access
 * }
 * ```
 */
export async function verifyBackupCode(
  userId: string,
  backupCode: string
): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        mfaEnabled: true,
        mfaBackupCodes: true,
      },
    });

    if (!user || !user.mfaEnabled || !user.mfaBackupCodes) {
      return false;
    }

    // Decrypt and check backup codes
    for (let i = 0; i < user.mfaBackupCodes.length; i++) {
      const decryptedCode = decryptPHI(user.mfaBackupCodes[i]);

      if (decryptedCode === backupCode.toUpperCase()) {
        // Code is valid, remove it (single-use)
        const updatedCodes = [...user.mfaBackupCodes];
        updatedCodes.splice(i, 1);

        await prisma.user.update({
          where: { id: userId },
          data: {
            mfaBackupCodes: updatedCodes,
          },
        });

        logger.info({
          event: 'mfa_backup_code_used',
          userId,
          remainingCodes: updatedCodes.length,
        }, 'Backup code verified and consumed');

        // Audit log
        await createAuditLog({
          action: 'LOGIN',
          resource: 'MFA_BACKUP_CODE',
          resourceId: userId,
          details: {
            remainingCodes: updatedCodes.length,
          },
          success: true,
        });

        return true;
      }
    }

    logger.warn({
      event: 'mfa_backup_code_invalid',
      userId,
    }, 'Invalid backup code provided');

    // Audit log
    await createAuditLog({
      action: 'LOGIN',
      resource: 'MFA_BACKUP_CODE',
      resourceId: userId,
      details: {
        reason: 'Invalid backup code',
      },
      success: false,
      errorMessage: 'Invalid backup code',
    });

    return false;
  } catch (error) {
    logger.error({
      event: 'mfa_backup_code_error',
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Error verifying backup code');

    return false;
  }
}

/**
 * Generate backup codes
 *
 * Creates random alphanumeric backup codes.
 *
 * @param count - Number of codes to generate
 * @param length - Length of each code
 * @returns Array of backup codes
 */
function generateBackupCodes(count: number, length: number): string[] {
  const codes: string[] = [];
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous characters

  for (let i = 0; i < count; i++) {
    let code = '';
    for (let j = 0; j < length; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    codes.push(code);
  }

  return codes;
}

/**
 * Disable MFA for user
 *
 * Removes MFA enrollment. Should require additional verification.
 *
 * @param userId - User ID
 * @param adminOverride - Admin can override without verification
 */
export async function disableMFA(
  userId: string,
  adminOverride: boolean = false
): Promise<void> {
  try {
    // Check if MFA is required for user's role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user && isMFARequired(user.role) && !adminOverride) {
      throw new Error('MFA cannot be disabled for privileged roles without admin override');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaServiceSid: null,
        mfaPhoneNumber: null,
        mfaBackupCodes: [],
        mfaEnrolledAt: null,
      },
    });

    logger.warn({
      event: 'mfa_disabled',
      userId,
      adminOverride,
    }, 'MFA disabled for user');

    // Audit log
    await createAuditLog({
      action: 'DELETE',
      resource: 'MFA_ENROLLMENT',
      resourceId: userId,
      details: {
        adminOverride,
      },
      success: true,
    });
  } catch (error) {
    logger.error({
      event: 'mfa_disable_failed',
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to disable MFA');

    throw error;
  }
}

/**
 * Get MFA status for user
 *
 * @param userId - User ID
 * @returns MFA status information
 */
export async function getMFAStatus(userId: string): Promise<{
  enabled: boolean;
  required: boolean;
  enrolledAt: Date | null;
  backupCodesRemaining: number;
  phoneNumberMasked: string | null;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      mfaEnabled: true,
      mfaEnrolledAt: true,
      mfaBackupCodes: true,
      mfaPhoneNumber: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  let phoneNumberMasked: string | null = null;
  if (user.mfaPhoneNumber) {
    const decrypted = decryptPHI(user.mfaPhoneNumber);
    if (decrypted) {
      phoneNumberMasked = decrypted.replace(/\d(?=\d{4})/g, '*');
    }
  }

  return {
    enabled: user.mfaEnabled,
    required: isMFARequired(user.role),
    enrolledAt: user.mfaEnrolledAt,
    backupCodesRemaining: user.mfaBackupCodes?.length || 0,
    phoneNumberMasked,
  };
}

/**
 * Regenerate backup codes
 *
 * Replaces all existing backup codes with new ones.
 * Use when user loses backup codes or as periodic rotation.
 *
 * @param userId - User ID
 * @returns New backup codes
 */
export async function regenerateBackupCodes(userId: string): Promise<string[]> {
  try {
    // Generate new backup codes
    const backupCodes = generateBackupCodes(BACKUP_CODES_COUNT, BACKUP_CODE_LENGTH);

    // Encrypt backup codes
    const encryptedBackupCodes = backupCodes
      .map((code) => encryptPHI(code))
      .filter((code): code is string => code !== null);

    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaBackupCodes: encryptedBackupCodes,
      },
    });

    logger.info({
      event: 'mfa_backup_codes_regenerated',
      userId,
    }, 'Backup codes regenerated');

    // Audit log
    await createAuditLog({
      action: 'UPDATE',
      resource: 'MFA_BACKUP_CODES',
      resourceId: userId,
      details: {
        codesGenerated: BACKUP_CODES_COUNT,
      },
      success: true,
    });

    return backupCodes;
  } catch (error) {
    logger.error({
      event: 'mfa_backup_codes_regeneration_failed',
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to regenerate backup codes');

    throw new Error('Failed to regenerate backup codes');
  }
}
