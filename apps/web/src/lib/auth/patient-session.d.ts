/**
 * Patient Session Management
 *
 * Utilities for verifying and managing patient authentication sessions
 * Features: Session timeouts, refresh tokens, Remember Me, activity tracking
 */
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
export declare function createPatientSession(userId: string, patientId: string, email: string, rememberMe?: boolean): Promise<string>;
/**
 * Get current patient session from cookies
 */
export declare function getPatientSession(): Promise<PatientSession | null>;
/**
 * Get current patient with full data
 */
export declare function getCurrentPatient(): Promise<any>;
/**
 * Require patient session or throw error
 */
export declare function requirePatientSession(): Promise<PatientSession>;
/**
 * Refresh patient session (extend expiration)
 */
export declare function refreshPatientSession(session: PatientSession): Promise<string>;
/**
 * Update last activity timestamp
 */
export declare function updateLastActivity(): Promise<void>;
/**
 * Clear patient session (logout)
 */
export declare function clearPatientSession(): Promise<void>;
/**
 * Revoke all sessions for a patient (e.g., on password change)
 */
export declare function revokeAllPatientSessions(patientId: string): Promise<void>;
/**
 * Check if patient has verified email
 */
export declare function isPatientEmailVerified(): Promise<boolean>;
/**
 * Check if patient has verified phone
 */
export declare function isPatientPhoneVerified(): Promise<boolean>;
//# sourceMappingURL=patient-session.d.ts.map