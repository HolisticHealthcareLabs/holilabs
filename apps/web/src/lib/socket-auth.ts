/**
 * Socket authentication helpers (NO NextAuth imports).
 *
 * This module is intentionally decoupled from NextAuth to avoid runtime issues
 * when bootstrapping Socket.IO from `pages/api` (Node runtime).
 */

import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { SignJWT } from 'jose';

/**
 * Mint a signed JWT for Socket.IO auth (clinician).
 * Uses NEXTAUTH_SECRET or SESSION_SECRET as the signing secret.
 */
export async function getUserSessionToken(userId: string): Promise<string | null> {
  try {
    const jwtSecretString = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET;
    if (!jwtSecretString) {
      throw new Error('CRITICAL: JWT secret not configured. Set NEXTAUTH_SECRET or SESSION_SECRET');
    }

    // Verify clinician exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) return null;

    const secret = new TextEncoder().encode(jwtSecretString);
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
 * Verify Socket.IO authentication token.
 *
 * Accepts:
 * - Clinician token minted by `getUserSessionToken()` (payload: {type:'CLINICIAN', userId})
 * - Patient JWT token minted by patient-session (payload: {type:'patient', patientId})
 */
export async function verifySocketToken(
  token: string
): Promise<{ userId: string; userType: 'CLINICIAN' | 'PATIENT' } | null> {
  try {
    const { jwtVerify } = await import('jose');

    const jwtSecretString = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET;
    if (!jwtSecretString) {
      throw new Error('CRITICAL: JWT secret not configured. Set NEXTAUTH_SECRET or SESSION_SECRET');
    }
    const JWT_SECRET = new TextEncoder().encode(jwtSecretString);

    const { payload } = await jwtVerify(token, JWT_SECRET);

    if (payload.type === 'patient' && payload.patientId) {
      const patient = await prisma.patientUser.findUnique({
        where: { id: payload.patientId as string },
        select: { id: true },
      });
      if (!patient) return null;
      return { userId: payload.patientId as string, userType: 'PATIENT' };
    }

    if (payload.type === 'CLINICIAN' && payload.userId) {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId as string },
        select: { id: true },
      });
      if (!user) return null;
      return { userId: payload.userId as string, userType: 'CLINICIAN' };
    }

    return null;
  } catch (error) {
    logger.error({
      event: 'verify_socket_token_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}


