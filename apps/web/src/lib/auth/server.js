"use strict";
/**
 * Server-side authentication utilities
 * Use in Server Components, Server Actions, and API Route Handlers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentUser = getCurrentUser;
exports.requireAuth = requireAuth;
exports.getCurrentPatientId = getCurrentPatientId;
exports.requireRole = requireRole;
exports.isAuthenticated = isAuthenticated;
const server_1 = require("@/lib/supabase/server");
const navigation_1 = require("next/navigation");
/**
 * Get the current authenticated user
 * Returns null if no user is logged in
 */
async function getCurrentUser() {
    const supabase = (0, server_1.createClient)();
    const { data: { user }, } = await supabase.auth.getUser();
    if (!user) {
        return null;
    }
    const role = user.user_metadata?.role ?? user.app_metadata?.role ?? 'PATIENT';
    return {
        id: user.id,
        email: user.email,
        role,
        patientId: role === 'PATIENT' ? user.id : null,
    };
}
/**
 * Get the current authenticated user or redirect to login
 * Use in protected pages
 */
async function requireAuth() {
    const user = await getCurrentUser();
    if (!user) {
        (0, navigation_1.redirect)('/auth/login');
    }
    return user;
}
/**
 * Get the current patient ID
 * Only works for authenticated patients
 * Returns null for non-patient users
 */
async function getCurrentPatientId() {
    const user = await getCurrentUser();
    return user?.patientId ?? null;
}
/**
 * Require a specific role
 * Redirects to login if not authenticated
 * Redirects to unauthorized if wrong role
 */
async function requireRole(allowedRoles) {
    const user = await requireAuth();
    if (!allowedRoles.includes(user.role)) {
        (0, navigation_1.redirect)('/unauthorized');
    }
    return user;
}
/**
 * Check if user is authenticated (boolean)
 */
async function isAuthenticated() {
    const user = await getCurrentUser();
    return user !== null;
}
//# sourceMappingURL=server.js.map