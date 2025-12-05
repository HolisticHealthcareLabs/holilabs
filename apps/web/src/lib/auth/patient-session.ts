/**
 * Patient Session Management
 *
 * Utilities for verifying and managing patient authentication sessions
 * Features: Session timeouts, refresh tokens, Remember Me, activity tracking
 * @compliance Phase 2.4: Security Hardening - Remove fallback secrets
 */

import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// Get JWT secret from environment - REQUIRED
const jwtSecretString = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET;
if (!jwtSecretString) {
  throw new Error(
    'CRITICAL: JWT secret not configured. ' +
    'Set NEXTAUTH_SECRET or SESSION_SECRET environment variable. ' +
    'Server cannot start without authentication secret.'
  );
}

const JWT_SECRET = new TextEncoder().encode(jwtSecretString);

// Session configuration
const SESSION_CONFIG = {
  // Regular session: 30 minutes of inactivity
  REGULAR_TIMEOUT: 30 * 60 * 1000, // 30 minutes in ms
  // Remember Me session: 30 days
  REMEMBER_ME_TIMEOUT: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
  // Session refresh threshold: Refresh if < 5 minutes left
  REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes in ms
  // Cookie name
  COOKIE_NAME: 'patient-session',
};

export interface PatientSession {
  userId: string;
  patientId: string;
  email: string;
  type: 'patient';
  expiresAt: number;
  issuedAt: number;
  rememberMe: boolean;
  lastActivity: number;
}

/**
 * Create a new patient session token
 */
export async function createPatientSession(
  userId: string,
  patientId: string,
  email: string,
  rememberMe: boolean = false
): Promise<string> {
  const now = Date.now();
  const timeout = rememberMe ? SESSION_CONFIG.REMEMBER_ME_TIMEOUT : SESSION_CONFIG.REGULAR_TIMEOUT;
  const expiresAt = now + timeout;

  const token = await new SignJWT({
    userId,
    patientId,
    email,
    type: 'patient',
    expiresAt,
    issuedAt: now,
    rememberMe,
    lastActivity: now,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now / 1000)
    .setExpirationTime(expiresAt / 1000)
    .sign(JWT_SECRET);

  // Set cookie
  const cookieStore = cookies();
  cookieStore.set(SESSION_CONFIG.COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: timeout / 1000, // Convert to seconds
    path: '/',
  });

  logger.info({
    event: 'patient_session_created',
    userId,
    patientId,
    email,
    rememberMe,
    expiresAt: new Date(expiresAt).toISOString(),
  });

  return token;
}

/**
 * Get current patient session from cookies
 */
export async function getPatientSession(): Promise<PatientSession | null> {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get(SESSION_CONFIG.COOKIE_NAME);

    if (!sessionCookie?.value) {
      return null;
    }

    // Verify JWT token
    const { payload } = await jwtVerify(sessionCookie.value, JWT_SECRET);

    // Validate payload structure
    if (
      !payload.userId ||
      !payload.patientId ||
      !payload.email ||
      payload.type !== 'patient'
    ) {
      logger.warn({
        event: 'invalid_patient_session_payload',
      });
      return null;
    }

    const now = Date.now();
    const expiresAt = payload.expiresAt as number;
    const lastActivity = (payload.lastActivity as number) || (payload.issuedAt as number);
    const rememberMe = (payload.rememberMe as boolean) || false;

    // Check if session has expired
    if (expiresAt < now) {
      logger.info({
        event: 'patient_session_expired',
        userId: payload.userId,
        expiresAt: new Date(expiresAt).toISOString(),
      });
      await clearPatientSession();
      return null;
    }

    // Check for inactivity timeout (only for non-remember-me sessions)
    if (!rememberMe) {
      const timeout = SESSION_CONFIG.REGULAR_TIMEOUT;
      const timeSinceLastActivity = now - lastActivity;

      if (timeSinceLastActivity > timeout) {
        logger.info({
          event: 'patient_session_inactive_timeout',
          userId: payload.userId,
          lastActivity: new Date(lastActivity).toISOString(),
          timeSinceLastActivity: Math.floor(timeSinceLastActivity / 1000 / 60) + ' minutes',
        });
        await clearPatientSession();
        return null;
      }
    }

    const session: PatientSession = {
      userId: payload.userId as string,
      patientId: payload.patientId as string,
      email: payload.email as string,
      type: 'patient',
      expiresAt,
      issuedAt: payload.issuedAt as number,
      rememberMe,
      lastActivity,
    };

    // Check if session needs refresh
    const timeUntilExpiry = expiresAt - now;
    if (timeUntilExpiry < SESSION_CONFIG.REFRESH_THRESHOLD) {
      await refreshPatientSession(session);
    }

    return session;
  } catch (error) {
    logger.error({
      event: 'patient_session_verify_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Get current patient with full data
 */
export async function getCurrentPatient() {
  const session = await getPatientSession();

  if (!session) {
    return null;
  }

  try {
    const patientUser = await prisma.patientUser.findUnique({
      where: { id: session.userId },
      include: {
        patient: true,
      },
    });

    if (!patientUser) {
      logger.warn({
        event: 'patient_session_user_not_found',
        userId: session.userId,
      });
      return null;
    }

    return patientUser;
  } catch (error) {
    logger.error({
      event: 'get_current_patient_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: session.userId,
    });
    return null;
  }
}

/**
 * Require patient session or throw error
 */
export async function requirePatientSession(): Promise<PatientSession> {
  const session = await getPatientSession();

  if (!session) {
    throw new Error('Unauthorized: Patient session required');
  }

  return session;
}

/**
 * Refresh patient session (extend expiration)
 */
export async function refreshPatientSession(session: PatientSession): Promise<string> {
  const now = Date.now();
  const timeout = session.rememberMe ? SESSION_CONFIG.REMEMBER_ME_TIMEOUT : SESSION_CONFIG.REGULAR_TIMEOUT;
  const newExpiresAt = now + timeout;

  const newToken = await new SignJWT({
    userId: session.userId,
    patientId: session.patientId,
    email: session.email,
    type: 'patient',
    expiresAt: newExpiresAt,
    issuedAt: session.issuedAt, // Keep original issued time
    rememberMe: session.rememberMe,
    lastActivity: now, // Update last activity
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(session.issuedAt / 1000)
    .setExpirationTime(newExpiresAt / 1000)
    .sign(JWT_SECRET);

  // Update cookie
  const cookieStore = cookies();
  cookieStore.set(SESSION_CONFIG.COOKIE_NAME, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: timeout / 1000,
    path: '/',
  });

  logger.info({
    event: 'patient_session_refreshed',
    userId: session.userId,
    patientId: session.patientId,
    newExpiresAt: new Date(newExpiresAt).toISOString(),
  });

  return newToken;
}

/**
 * Update last activity timestamp
 */
export async function updateLastActivity(): Promise<void> {
  const session = await getPatientSession();

  if (!session) {
    return;
  }

  const now = Date.now();

  // Only update if more than 1 minute has passed since last update
  if (now - session.lastActivity < 60 * 1000) {
    return;
  }

  const timeout = session.rememberMe ? SESSION_CONFIG.REMEMBER_ME_TIMEOUT : SESSION_CONFIG.REGULAR_TIMEOUT;
  const newExpiresAt = now + timeout;

  const newToken = await new SignJWT({
    userId: session.userId,
    patientId: session.patientId,
    email: session.email,
    type: 'patient',
    expiresAt: newExpiresAt,
    issuedAt: session.issuedAt,
    rememberMe: session.rememberMe,
    lastActivity: now,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(session.issuedAt / 1000)
    .setExpirationTime(newExpiresAt / 1000)
    .sign(JWT_SECRET);

  const cookieStore = cookies();
  cookieStore.set(SESSION_CONFIG.COOKIE_NAME, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: timeout / 1000,
    path: '/',
  });
}

/**
 * Clear patient session (logout)
 */
export async function clearPatientSession(): Promise<void> {
  const session = await getPatientSession();

  const cookieStore = cookies();
  cookieStore.delete(SESSION_CONFIG.COOKIE_NAME);

  if (session) {
    logger.info({
      event: 'patient_session_cleared',
      userId: session.userId,
      patientId: session.patientId,
    });
  }
}

/**
 * Revoke all sessions for a patient (e.g., on password change)
 */
export async function revokeAllPatientSessions(patientId: string): Promise<void> {
  // In a production system, you would:
  // 1. Store session IDs in a database or Redis
  // 2. Mark all sessions for this patient as revoked
  // 3. Check revocation status on each session verification

  // For now, we log this action
  logger.info({
    event: 'all_patient_sessions_revoked',
    patientId,
    reason: 'security_action',
  });

  // Clear current session
  await clearPatientSession();
}

/**
 * Check if patient has verified email
 */
export async function isPatientEmailVerified(): Promise<boolean> {
  const patientUser = await getCurrentPatient();

  if (!patientUser) {
    return false;
  }

  return !!patientUser.emailVerifiedAt;
}

/**
 * Check if patient has verified phone
 */
export async function isPatientPhoneVerified(): Promise<boolean> {
  const patientUser = await getCurrentPatient();

  if (!patientUser) {
    return false;
  }

  return !!patientUser.phoneVerifiedAt;
}
