/**
 * Patient Password Login API
 *
 * POST /api/portal/auth/login - Authenticate patient with email + password
 *
 * Features:
 * - Password verification with bcryptjs
 * - Account lockout after 5 failed attempts (15 min)
 * - Email verification check
 * - Session creation with JWT
 * - Rate limiting (5 attempts per 15 min per IP)
 * - HIPAA audit logging
 *
 * @security Rate limited to prevent brute force attacks
 * @compliance HIPAA §164.312(a)(2)(i) - User authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createPatientSession } from '@/lib/auth/patient-session';
import { createAuditLog } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { createPublicRoute } from '@/lib/api/middleware';

export const dynamic = 'force-dynamic';

export const POST = createPublicRoute(
  async (request: NextRequest) => {
    try {
      const body = await request.json();
      const { email, password, rememberMe } = body;

      // Validate input
      if (!email || !password) {
        return NextResponse.json(
          { error: 'Email and password are required' },
          { status: 400 }
        );
      }

      // Find patient user by email
      const patientUser = await prisma.patientUser.findUnique({
        where: { email: email.toLowerCase() },
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
      });

      // Check if user exists
      if (!patientUser) {
        // SECURITY: Don't reveal if email exists
        logger.info({
          event: 'portal_login_user_not_found',
          email: email.toLowerCase(),
        });

        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      // Check if account is locked
      if (patientUser.lockedUntil && new Date() < patientUser.lockedUntil) {
        const retryAfter = Math.ceil(
          (patientUser.lockedUntil.getTime() - Date.now()) / 1000 / 60
        );

        logger.warn({
          event: 'portal_login_account_locked',
          patientUserId: patientUser.id,
          lockedUntil: patientUser.lockedUntil,
        });

        await createAuditLog({
          action: 'LOGIN',
          resource: 'PatientAuth',
          resourceId: patientUser.id,
          details: {
            method: 'password',
            reason: 'account_locked',
            retryAfter: `${retryAfter} minutes`,
          },
          success: false,
        });

        return NextResponse.json(
          {
            error: 'Account locked due to too many failed login attempts',
            retryAfter: `${retryAfter} minutes`,
          },
          { status: 423 }
        );
      }

      // Check if password hash exists
      if (!patientUser.passwordHash) {
        logger.warn({
          event: 'portal_login_no_password',
          patientUserId: patientUser.id,
        });

        return NextResponse.json(
          {
            error: 'Password login not enabled for this account',
            hint: 'Try using the magic link option',
          },
          { status: 401 }
        );
      }

      // Verify password
      const passwordValid = await bcrypt.compare(password, patientUser.passwordHash);

      if (!passwordValid) {
        // Increment failed login attempts
        const newAttempts = patientUser.loginAttempts + 1;
        const updates: any = {
          loginAttempts: newAttempts,
        };

        // Lock account after 5 failed attempts
        if (newAttempts >= 5) {
          updates.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
          updates.loginAttempts = 0; // Reset counter after lock
        }

        await prisma.patientUser.update({
          where: { id: patientUser.id },
          data: updates,
        });

        logger.warn({
          event: 'portal_login_invalid_password',
          patientUserId: patientUser.id,
          attempts: newAttempts,
          locked: newAttempts >= 5,
        });

        await createAuditLog({
          action: 'LOGIN',
          resource: 'PatientAuth',
          resourceId: patientUser.id,
          details: {
            method: 'password',
            reason: 'invalid_password',
            attempts: newAttempts,
            locked: newAttempts >= 5,
          },
          success: false,
        });

        return NextResponse.json(
          {
            error: 'Invalid email or password',
            attemptsRemaining: newAttempts >= 5 ? 0 : 5 - newAttempts,
          },
          { status: 401 }
        );
      }

      // Check email verification
      if (!patientUser.emailVerifiedAt) {
        logger.info({
          event: 'portal_login_unverified_email',
          patientUserId: patientUser.id,
        });

        await createAuditLog({
          action: 'LOGIN',
          resource: 'PatientAuth',
          resourceId: patientUser.id,
          details: {
            method: 'password',
            reason: 'email_not_verified',
          },
          success: false,
        });

        return NextResponse.json(
          {
            error: 'Please verify your email address before logging in',
            hint: 'Check your inbox for a verification email',
          },
          { status: 403 }
        );
      }

      // Reset failed login attempts and update last login
      const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
      await prisma.patientUser.update({
        where: { id: patientUser.id },
        data: {
          loginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
          lastLoginIp: ipAddress,
        },
      });

      // Create patient session with JWT
      await createPatientSession(
        patientUser.id,
        patientUser.patient.id,
        patientUser.email,
        rememberMe || false
      );

      // HIPAA Audit Log: Successful patient login
      await createAuditLog({
        action: 'LOGIN',
        resource: 'PatientAuth',
        resourceId: patientUser.id,
        details: {
          method: 'password',
          patientId: patientUser.patient.id,
          rememberMe: rememberMe || false,
          sessionCreated: true,
        },
        success: true,
      });

      logger.info({
        event: 'portal_login_success',
        patientUserId: patientUser.id,
        patientId: patientUser.patient.id,
      });

      return NextResponse.json(
        {
          success: true,
          patient: {
            id: patientUser.patient.id,
            firstName: patientUser.patient.firstName,
            lastName: patientUser.patient.lastName,
            mrn: patientUser.patient.mrn,
          },
        },
        { status: 200 }
      );
    } catch (error) {
      logger.error({
        event: 'portal_login_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      return NextResponse.json(
        {
          error: 'Failed to process login request',
          details:
            process.env.NODE_ENV === 'development'
              ? error instanceof Error
                ? error.message
                : 'Unknown error'
              : undefined,
        },
        { status: 500 }
      );
    }
  },
  {
    // ✅ SECURITY: Rate limiting to prevent brute force attacks
    // Limits: 5 attempts per 15 minutes per IP address
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // 5 attempts per 15 minutes
    },
  }
);
