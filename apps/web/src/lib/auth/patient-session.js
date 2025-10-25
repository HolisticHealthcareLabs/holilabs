"use strict";
/**
 * Patient Session Management
 *
 * Utilities for verifying and managing patient authentication sessions
 * Features: Session timeouts, refresh tokens, Remember Me, activity tracking
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPatientSession = createPatientSession;
exports.getPatientSession = getPatientSession;
exports.getCurrentPatient = getCurrentPatient;
exports.requirePatientSession = requirePatientSession;
exports.refreshPatientSession = refreshPatientSession;
exports.updateLastActivity = updateLastActivity;
exports.clearPatientSession = clearPatientSession;
exports.revokeAllPatientSessions = revokeAllPatientSessions;
exports.isPatientEmailVerified = isPatientEmailVerified;
exports.isPatientPhoneVerified = isPatientPhoneVerified;
const headers_1 = require("next/headers");
const jose_1 = require("jose");
const prisma_1 = require("@/lib/prisma");
const logger_1 = __importDefault(require("@/lib/logger"));
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || 'fallback-secret');
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
/**
 * Create a new patient session token
 */
async function createPatientSession(userId, patientId, email, rememberMe = false) {
    const now = Date.now();
    const timeout = rememberMe ? SESSION_CONFIG.REMEMBER_ME_TIMEOUT : SESSION_CONFIG.REGULAR_TIMEOUT;
    const expiresAt = now + timeout;
    const token = await new jose_1.SignJWT({
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
    const cookieStore = (0, headers_1.cookies)();
    cookieStore.set(SESSION_CONFIG.COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: timeout / 1000, // Convert to seconds
        path: '/',
    });
    logger_1.default.info({
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
async function getPatientSession() {
    try {
        const cookieStore = (0, headers_1.cookies)();
        const sessionCookie = cookieStore.get(SESSION_CONFIG.COOKIE_NAME);
        if (!sessionCookie?.value) {
            return null;
        }
        // Verify JWT token
        const { payload } = await (0, jose_1.jwtVerify)(sessionCookie.value, JWT_SECRET);
        // Validate payload structure
        if (!payload.userId ||
            !payload.patientId ||
            !payload.email ||
            payload.type !== 'patient') {
            logger_1.default.warn({
                event: 'invalid_patient_session_payload',
            });
            return null;
        }
        const now = Date.now();
        const expiresAt = payload.expiresAt;
        const lastActivity = payload.lastActivity || payload.issuedAt;
        const rememberMe = payload.rememberMe || false;
        // Check if session has expired
        if (expiresAt < now) {
            logger_1.default.info({
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
                logger_1.default.info({
                    event: 'patient_session_inactive_timeout',
                    userId: payload.userId,
                    lastActivity: new Date(lastActivity).toISOString(),
                    timeSinceLastActivity: Math.floor(timeSinceLastActivity / 1000 / 60) + ' minutes',
                });
                await clearPatientSession();
                return null;
            }
        }
        const session = {
            userId: payload.userId,
            patientId: payload.patientId,
            email: payload.email,
            type: 'patient',
            expiresAt,
            issuedAt: payload.issuedAt,
            rememberMe,
            lastActivity,
        };
        // Check if session needs refresh
        const timeUntilExpiry = expiresAt - now;
        if (timeUntilExpiry < SESSION_CONFIG.REFRESH_THRESHOLD) {
            await refreshPatientSession(session);
        }
        return session;
    }
    catch (error) {
        logger_1.default.error({
            event: 'patient_session_verify_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return null;
    }
}
/**
 * Get current patient with full data
 */
async function getCurrentPatient() {
    const session = await getPatientSession();
    if (!session) {
        return null;
    }
    try {
        const patientUser = await prisma_1.prisma.patientUser.findUnique({
            where: { id: session.userId },
            include: {
                patient: true,
            },
        });
        if (!patientUser) {
            logger_1.default.warn({
                event: 'patient_session_user_not_found',
                userId: session.userId,
            });
            return null;
        }
        return patientUser;
    }
    catch (error) {
        logger_1.default.error({
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
async function requirePatientSession() {
    const session = await getPatientSession();
    if (!session) {
        throw new Error('Unauthorized: Patient session required');
    }
    return session;
}
/**
 * Refresh patient session (extend expiration)
 */
async function refreshPatientSession(session) {
    const now = Date.now();
    const timeout = session.rememberMe ? SESSION_CONFIG.REMEMBER_ME_TIMEOUT : SESSION_CONFIG.REGULAR_TIMEOUT;
    const newExpiresAt = now + timeout;
    const newToken = await new jose_1.SignJWT({
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
    const cookieStore = (0, headers_1.cookies)();
    cookieStore.set(SESSION_CONFIG.COOKIE_NAME, newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: timeout / 1000,
        path: '/',
    });
    logger_1.default.info({
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
async function updateLastActivity() {
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
    const newToken = await new jose_1.SignJWT({
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
    const cookieStore = (0, headers_1.cookies)();
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
async function clearPatientSession() {
    const session = await getPatientSession();
    const cookieStore = (0, headers_1.cookies)();
    cookieStore.delete(SESSION_CONFIG.COOKIE_NAME);
    if (session) {
        logger_1.default.info({
            event: 'patient_session_cleared',
            userId: session.userId,
            patientId: session.patientId,
        });
    }
}
/**
 * Revoke all sessions for a patient (e.g., on password change)
 */
async function revokeAllPatientSessions(patientId) {
    // In a production system, you would:
    // 1. Store session IDs in a database or Redis
    // 2. Mark all sessions for this patient as revoked
    // 3. Check revocation status on each session verification
    // For now, we log this action
    logger_1.default.info({
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
async function isPatientEmailVerified() {
    const patientUser = await getCurrentPatient();
    if (!patientUser) {
        return false;
    }
    return !!patientUser.emailVerifiedAt;
}
/**
 * Check if patient has verified phone
 */
async function isPatientPhoneVerified() {
    const patientUser = await getCurrentPatient();
    if (!patientUser) {
        return false;
    }
    return !!patientUser.phoneVerifiedAt;
}
//# sourceMappingURL=patient-session.js.map