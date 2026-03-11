/**
 * Auth Facade — Backward Compatibility Layer
 *
 * Delegates to the canonical auth instance at @/lib/auth/auth.ts.
 * Keeps Socket.io utilities and the legacy getServerSession() API
 * so ~95 files importing from '@/lib/auth' continue to work.
 *
 * DO NOT add new auth configuration here. Edit auth.config.ts instead.
 */

export type { Session } from 'next-auth';
export type NextAuthOptions = any;

import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * Legacy authOptions — kept as an empty marker for files that destructure it.
 * All real configuration lives in auth.config.ts.
 */
export const authOptions: NextAuthOptions = {};

/**
 * Backward compatible getServerSession function.
 * Delegates to the single NextAuth v5 auth() instance.
 */
export async function getServerSession(_authOptions?: any) {
  return await auth();
}

export const clinicianAuthFunction = auth;

/**
 * Get user session token for Socket.io authentication
 * @compliance Phase 2.4: Security Hardening - Proper JWT signing
 */
export async function getUserSessionToken(userId: string): Promise<string | null> {
  try {
    const { SignJWT } = await import('jose');

    // Get JWT secret from environment - REQUIRED
    const jwtSecretString = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET;
    if (!jwtSecretString) {
      throw new Error('CRITICAL: JWT secret not configured. Set NEXTAUTH_SECRET or SESSION_SECRET');
    }

    const secret = new TextEncoder().encode(jwtSecretString);

    // Generate signed JWT token with expiration
    const token = await new SignJWT({ userId, type: 'CLINICIAN' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .setIssuedAt()
      .sign(secret);

    return token;
  } catch (error) {
    logger.error({
      event: 'get_session_token_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
    });
    return null;
  }
}

/**
 * Verify Socket.io authentication token
 * @compliance Phase 2.4: Security Hardening - Only use signed JWT tokens
 *
 * ⚠️ SECURITY CHANGE: Removed insecure base64 decode fallback
 * All tokens must be properly signed JWTs - no tampering possible
 */
export async function verifySocketToken(token: string): Promise<{ userId: string; userType: 'CLINICIAN' | 'PATIENT' } | null> {
  try {
    // Verify JWT token signature
    const { jwtVerify } = await import('jose');

    // Get JWT secret from environment - REQUIRED
    const jwtSecretString = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET;
    if (!jwtSecretString) {
      throw new Error('CRITICAL: JWT secret not configured. Set NEXTAUTH_SECRET or SESSION_SECRET');
    }

    const JWT_SECRET = new TextEncoder().encode(jwtSecretString);

    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Patient JWT token (from patient-session)
    if (payload.type === 'patient' && payload.patientId) {
      // Verify patient exists
      const patient = await prisma.patientUser.findUnique({
        where: { id: payload.patientId as string },
        select: { id: true },
      });

      if (!patient) return null;

      return {
        userId: payload.patientId as string,
        userType: 'PATIENT',
      };
    }

    // Clinician JWT token (from getUserSessionToken)
    if (payload.type === 'CLINICIAN' && payload.userId) {
      // Verify clinician exists
      const user = await prisma.user.findUnique({
        where: { id: payload.userId as string },
        select: { id: true },
      });

      if (!user) return null;

      return {
        userId: payload.userId as string,
        userType: 'CLINICIAN',
      };
    }

    // Invalid token type
    return null;
  } catch (error) {
    logger.error({
      event: 'verify_socket_token_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}
