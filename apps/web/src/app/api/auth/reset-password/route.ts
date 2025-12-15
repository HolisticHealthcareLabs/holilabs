/**
 * Password Reset API Routes
 *
 * Endpoints:
 * - POST /api/auth/reset-password/request - Request password reset
 * - POST /api/auth/reset-password/reset - Reset password with token
 * - GET /api/auth/reset-password/validate - Validate reset token
 *
 * @compliance HIPAA §164.312(a)(2)(i) - Password management
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPasswordResetService } from '@/lib/auth/password-reset';
import { getClientIp, getUserAgent } from '@/lib/auth/session-security';
import logger from '@/lib/logger';
import { z } from 'zod';

// Request password reset schema
const RequestResetSchema = z.object({
  email: z.string().email('Invalid email address'),
  userType: z.enum(['CLINICIAN', 'PATIENT']).default('PATIENT'),
});

// Reset password schema
const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number, and special character'
    ),
  userType: z.enum(['CLINICIAN', 'PATIENT']).default('PATIENT'),
});

// Validate token schema
const ValidateTokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

/**
 * POST /api/auth/reset-password/request
 * Request a password reset email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const validation = RequestResetSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request data',
          errors: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { email, userType } = validation.data;
    const ipAddress = getClientIp(request);
    const userAgent = getUserAgent(request);

    const passwordResetService = getPasswordResetService();

    let result;
    if (userType === 'CLINICIAN') {
      result = await passwordResetService.requestClinicianReset(email, ipAddress, userAgent);
    } else {
      result = await passwordResetService.requestPatientReset(email, ipAddress, userAgent);
    }

    // Always return 200 to prevent email enumeration
    return NextResponse.json(
      {
        success: true,
        message: result.message,
        // Only include resetUrl in development
        ...(process.env.NODE_ENV === 'development' && result.resetUrl
          ? { resetUrl: result.resetUrl }
          : {}),
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({
      event: 'password_reset_request_api_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while processing your request',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/auth/reset-password
 * Reset password with token
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const validation = ResetPasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request data',
          errors: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { token, newPassword, userType } = validation.data;
    const ipAddress = getClientIp(request);

    const passwordResetService = getPasswordResetService();

    let result;
    if (userType === 'CLINICIAN') {
      result = await passwordResetService.resetClinicianPassword(token, newPassword, ipAddress);
    } else {
      result = await passwordResetService.resetPatientPassword(token, newPassword, ipAddress);
    }

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    logger.error({
      event: 'password_reset_api_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while resetting your password',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/reset-password/validate
 * Validate a reset token
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        {
          valid: false,
          message: 'Token is required',
        },
        { status: 400 }
      );
    }

    const passwordResetService = getPasswordResetService();
    const validation = await passwordResetService.validateResetToken(token);

    return NextResponse.json({
      valid: validation.valid,
      message: validation.reason,
    });
  } catch (error) {
    logger.error({
      event: 'validate_reset_token_api_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        valid: false,
        message: 'An error occurred while validating the token',
      },
      { status: 500 }
    );
  }
}
