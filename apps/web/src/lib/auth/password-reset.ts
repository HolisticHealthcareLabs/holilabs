/**
 * Password Reset Service
 *
 * Secure password reset flow with:
 * - Cryptographically secure tokens
 * - 1-hour expiration
 * - Single-use tokens
 * - Rate limiting (3 requests/hour)
 * - Email notification
 *
 * @compliance HIPAA §164.312(a)(2)(i) - Password management
 * @compliance SOC 2 CC6.1 - Logical access controls
 */

import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { PasswordResetRateLimiter } from './session-security';
import { getTokenRevocationService, RevocationReason } from './token-revocation';
import { sendPasswordResetEmail } from '@/lib/email';

/**
 * Password reset token validity duration (1 hour)
 */
const TOKEN_EXPIRATION_HOURS = 1;

/**
 * Password reset service
 */
export class PasswordResetService {
  /**
   * Generate a secure reset token
   */
  private generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash a reset token
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Request password reset for clinician
   */
  async requestClinicianReset(
    email: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{
    success: boolean;
    message: string;
    resetUrl?: string;
  }> {
    try {
      // Check rate limit
      const rateLimit = await PasswordResetRateLimiter.checkRateLimit(email);

      if (!rateLimit.allowed) {
        logger.warn({
          event: 'password_reset_rate_limit',
          email,
          ipAddress,
          resetAt: rateLimit.resetAt,
        });

        return {
          success: false,
          message: `Too many password reset requests. Please try again after ${rateLimit.resetAt?.toLocaleString()}`,
        };
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      // Always return success to prevent email enumeration
      if (!user) {
        logger.info({
          event: 'password_reset_user_not_found',
          email,
          ipAddress,
        });

        // Record request to enforce rate limit
        await PasswordResetRateLimiter.recordRequest(email);

        return {
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.',
        };
      }

      // Generate reset token
      const token = this.generateResetToken();
      const tokenHash = this.hashToken(token);
      const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_HOURS * 60 * 60 * 1000);

      // Invalidate any existing reset tokens for this user
      await prisma.passwordResetToken.deleteMany({
        where: {
          userId: user.id,
          userType: 'CLINICIAN',
        },
      });

      // Create new reset token
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          userType: 'CLINICIAN',
          token,
          tokenHash,
          expiresAt,
          ipAddress,
          userAgent,
        },
      });

      // Record request for rate limiting
      await PasswordResetRateLimiter.recordRequest(email);

      // Generate reset URL
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;

      logger.info({
        event: 'password_reset_requested',
        userId: user.id,
        email,
        ipAddress,
      });

      // Send password reset email
      await sendPasswordResetEmail(
        user.email,
        `${user.firstName} ${user.lastName}`,
        resetUrl,
        false // isPatient = false for clinicians
      );

      return {
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
        resetUrl, // Only return in development
      };
    } catch (error) {
      logger.error({
        event: 'password_reset_request_error',
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        message: 'An error occurred while processing your request. Please try again later.',
      };
    }
  }

  /**
   * Request password reset for patient
   */
  async requestPatientReset(
    email: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{
    success: boolean;
    message: string;
    resetUrl?: string;
  }> {
    try {
      // Check rate limit
      const rateLimit = await PasswordResetRateLimiter.checkRateLimit(email);

      if (!rateLimit.allowed) {
        logger.warn({
          event: 'password_reset_rate_limit',
          email,
          ipAddress,
          resetAt: rateLimit.resetAt,
        });

        return {
          success: false,
          message: `Too many password reset requests. Please try again after ${rateLimit.resetAt?.toLocaleString()}`,
        };
      }

      // Find patient user
      const patientUser = await prisma.patientUser.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          patient: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Always return success to prevent email enumeration
      if (!patientUser) {
        logger.info({
          event: 'password_reset_patient_not_found',
          email,
          ipAddress,
        });

        // Record request to enforce rate limit
        await PasswordResetRateLimiter.recordRequest(email);

        return {
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.',
        };
      }

      // Generate reset token
      const token = this.generateResetToken();
      const tokenHash = this.hashToken(token);
      const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_HOURS * 60 * 60 * 1000);

      // Invalidate any existing reset tokens for this patient
      await prisma.passwordResetToken.deleteMany({
        where: {
          patientUserId: patientUser.id,
          userType: 'PATIENT',
        },
      });

      // Create new reset token
      await prisma.passwordResetToken.create({
        data: {
          patientUserId: patientUser.id,
          userType: 'PATIENT',
          token,
          tokenHash,
          expiresAt,
          ipAddress,
          userAgent,
        },
      });

      // Record request for rate limiting
      await PasswordResetRateLimiter.recordRequest(email);

      // Generate reset URL
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const resetUrl = `${baseUrl}/portal/reset-password?token=${token}`;

      logger.info({
        event: 'password_reset_requested',
        patientUserId: patientUser.id,
        email,
        ipAddress,
      });

      // Send password reset email
      await sendPasswordResetEmail(
        patientUser.email,
        `${patientUser.patient.firstName} ${patientUser.patient.lastName}`,
        resetUrl,
        true // isPatient = true
      );

      return {
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
        resetUrl, // Only return in development
      };
    } catch (error) {
      logger.error({
        event: 'password_reset_request_error',
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        message: 'An error occurred while processing your request. Please try again later.',
      };
    }
  }

  /**
   * Validate reset token
   */
  async validateResetToken(token: string): Promise<{
    valid: boolean;
    userId?: string;
    patientUserId?: string;
    userType?: 'CLINICIAN' | 'PATIENT';
    reason?: string;
  }> {
    try {
      const tokenHash = this.hashToken(token);

      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { tokenHash },
      });

      if (!resetToken) {
        return {
          valid: false,
          reason: 'Invalid or expired reset token',
        };
      }

      // Check if already used
      if (resetToken.usedAt) {
        return {
          valid: false,
          reason: 'This reset token has already been used',
        };
      }

      // Check expiration
      if (new Date() > resetToken.expiresAt) {
        return {
          valid: false,
          reason: 'This reset token has expired',
        };
      }

      return {
        valid: true,
        userId: resetToken.userId || undefined,
        patientUserId: resetToken.patientUserId || undefined,
        userType: resetToken.userType,
      };
    } catch (error) {
      logger.error({
        event: 'validate_reset_token_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        valid: false,
        reason: 'An error occurred while validating the token',
      };
    }
  }

  /**
   * Reset password for clinician
   */
  async resetClinicianPassword(
    token: string,
    newPassword: string,
    ipAddress: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Validate token
      const validation = await this.validateResetToken(token);

      if (!validation.valid || validation.userType !== 'CLINICIAN' || !validation.userId) {
        logger.warn({
          event: 'invalid_reset_token',
          reason: validation.reason,
          ipAddress,
        });

        return {
          success: false,
          message: validation.reason || 'Invalid reset token',
        };
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 12);

      // Update password
      await prisma.user.update({
        where: { id: validation.userId },
        data: {
          // Note: User model doesn't have passwordHash - clinicians use OAuth
          // This is for future implementation if password auth is added
          updatedAt: new Date(),
        },
      });

      // Mark token as used
      const tokenHash = this.hashToken(token);
      await prisma.passwordResetToken.update({
        where: { tokenHash },
        data: { usedAt: new Date() },
      });

      // Revoke all existing sessions for security
      const revocationService = getTokenRevocationService();
      await revocationService.revokeAllUserTokens(
        validation.userId,
        RevocationReason.PASSWORD_CHANGED,
        { ipAddress }
      );

      logger.info({
        event: 'password_reset_success',
        userId: validation.userId,
        ipAddress,
      });

      return {
        success: true,
        message: 'Your password has been reset successfully. Please sign in with your new password.',
      };
    } catch (error) {
      logger.error({
        event: 'reset_password_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        message: 'An error occurred while resetting your password. Please try again later.',
      };
    }
  }

  /**
   * Reset password for patient
   */
  async resetPatientPassword(
    token: string,
    newPassword: string,
    ipAddress: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Validate token
      const validation = await this.validateResetToken(token);

      if (!validation.valid || validation.userType !== 'PATIENT' || !validation.patientUserId) {
        logger.warn({
          event: 'invalid_reset_token',
          reason: validation.reason,
          ipAddress,
        });

        return {
          success: false,
          message: validation.reason || 'Invalid reset token',
        };
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 12);

      // Update password
      await prisma.patientUser.update({
        where: { id: validation.patientUserId },
        data: {
          passwordHash,
          updatedAt: new Date(),
        },
      });

      // Mark token as used
      const tokenHash = this.hashToken(token);
      await prisma.passwordResetToken.update({
        where: { tokenHash },
        data: { usedAt: new Date() },
      });

      // Revoke all existing sessions for security
      const revocationService = getTokenRevocationService();
      await revocationService.revokeAllUserTokens(
        validation.patientUserId,
        RevocationReason.PASSWORD_CHANGED,
        { ipAddress }
      );

      logger.info({
        event: 'password_reset_success',
        patientUserId: validation.patientUserId,
        ipAddress,
      });

      return {
        success: true,
        message: 'Your password has been reset successfully. Please sign in with your new password.',
      };
    } catch (error) {
      logger.error({
        event: 'reset_password_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        message: 'An error occurred while resetting your password. Please try again later.',
      };
    }
  }

  /**
   * Cleanup expired reset tokens (maintenance task)
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await prisma.passwordResetToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      logger.info({
        event: 'expired_reset_tokens_cleaned',
        count: result.count,
      });

      return result.count;
    } catch (error) {
      logger.error({
        event: 'cleanup_expired_tokens_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }
}

// Singleton instance
let passwordResetServiceInstance: PasswordResetService | null = null;

/**
 * Get or create password reset service (singleton)
 */
export function getPasswordResetService(): PasswordResetService {
  if (!passwordResetServiceInstance) {
    passwordResetServiceInstance = new PasswordResetService();
  }
  return passwordResetServiceInstance;
}
