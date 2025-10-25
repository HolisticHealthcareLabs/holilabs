/**
 * Server-side authentication utilities
 * Use in Server Components, Server Actions, and API Route Handlers
 */
export interface CurrentUser {
    id: string;
    email: string;
    role: string;
    patientId: string | null;
}
/**
 * Get the current authenticated user
 * Returns null if no user is logged in
 */
export declare function getCurrentUser(): Promise<CurrentUser | null>;
/**
 * Get the current authenticated user or redirect to login
 * Use in protected pages
 */
export declare function requireAuth(): Promise<CurrentUser>;
/**
 * Get the current patient ID
 * Only works for authenticated patients
 * Returns null for non-patient users
 */
export declare function getCurrentPatientId(): Promise<string | null>;
/**
 * Require a specific role
 * Redirects to login if not authenticated
 * Redirects to unauthorized if wrong role
 */
export declare function requireRole(allowedRoles: string[]): Promise<CurrentUser>;
/**
 * Check if user is authenticated (boolean)
 */
export declare function isAuthenticated(): Promise<boolean>;
//# sourceMappingURL=server.d.ts.map