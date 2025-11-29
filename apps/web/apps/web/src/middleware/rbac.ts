/**
 * Role-Based Access Control (RBAC) Middleware
 *
 * Industry-grade permission system inspired by Medplum's access policies
 * Supports both role-based and permission-based authorization
 *
 * @inspiration Medplum AccessPolicy architecture
 * @compliance LGPD Art. 9 (Access control), HIPAA 164.308(a)(4)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import type { UserRole } from '@prisma/client';

/**
 * Permission format: "resource:action"
 * Examples: "patient:read", "prescription:write", "audit:admin"
 */
export type Permission =
  | 'patient:read'
  | 'patient:write'
  | 'patient:delete'
  | 'prescription:read'
  | 'prescription:write'
  | 'prescription:approve'
  | 'lab:read'
  | 'lab:write'
  | 'lab:approve'
  | 'billing:read'
  | 'billing:write'
  | 'audit:read'
  | 'audit:admin'
  | 'user:read'
  | 'user:write'
  | 'user:admin'
  | 'appointment:read'
  | 'appointment:write'
  | 'settings:read'
  | 'settings:write';

/**
 * Role-to-permissions mapping
 * Defines default permissions for each role
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // Clinic owner - full access
  ADMIN: [
    'patient:read',
    'patient:write',
    'patient:delete',
    'prescription:read',
    'prescription:write',
    'prescription:approve',
    'lab:read',
    'lab:write',
    'lab:approve',
    'billing:read',
    'billing:write',
    'audit:read',
    'audit:admin',
    'user:read',
    'user:write',
    'user:admin',
    'appointment:read',
    'appointment:write',
    'settings:read',
    'settings:write',
  ],

  // Doctor - full patient care
  PHYSICIAN: [
    'patient:read',
    'patient:write',
    'prescription:read',
    'prescription:write',
    'prescription:approve',
    'lab:read',
    'lab:write',
    'appointment:read',
    'appointment:write',
    'billing:read',
    'settings:read',
  ],

  // Nurse - patient care without prescription approval
  NURSE: [
    'patient:read',
    'patient:write',
    'prescription:read',
    'prescription:write', // Can create, but cannot approve
    'lab:read',
    'lab:write',
    'appointment:read',
    'appointment:write',
    'settings:read',
  ],

  // Receptionist - front desk operations
  RECEPTIONIST: [
    'patient:read', // Basic patient info for scheduling
    'appointment:read',
    'appointment:write',
    'billing:read',
    'billing:write',
    'settings:read',
  ],

  // Lab technician - lab results only
  LAB_TECH: [
    'patient:read', // Basic info for sample identification
    'lab:read',
    'lab:write',
    'settings:read',
  ],

  // Pharmacist - prescription fulfillment
  PHARMACIST: [
    'patient:read', // Basic info for prescription verification
    'prescription:read',
    'prescription:approve', // Can approve/reject prescriptions
    'settings:read',
  ],

  // Legacy roles (backwards compatibility)
  CLINICIAN: [
    'patient:read',
    'patient:write',
    'prescription:read',
    'prescription:write',
    'prescription:approve',
    'lab:read',
    'lab:write',
    'appointment:read',
    'appointment:write',
    'billing:read',
    'settings:read',
  ],

  STAFF: [
    'patient:read',
    'appointment:read',
    'appointment:write',
    'billing:read',
    'billing:write',
    'settings:read',
  ],
};

/**
 * Check if user has required role
 *
 * @param userRole - User's assigned role
 * @param requiredRoles - List of roles that have access
 * @returns true if user has one of the required roles
 */
export function hasRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole);
}

/**
 * Check if user has required permission
 *
 * @param userRole - User's assigned role
 * @param userPermissions - User's custom permissions (overrides role defaults)
 * @param requiredPermissions - List of permissions needed (OR logic)
 * @returns true if user has at least one of the required permissions
 */
export function hasPermission(
  userRole: UserRole,
  userPermissions: string[],
  requiredPermissions: Permission[]
): boolean {
  // Get default permissions for role
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];

  // Merge role permissions with custom permissions
  const allPermissions = new Set([...rolePermissions, ...userPermissions]);

  // Check if user has at least one required permission (OR logic)
  return requiredPermissions.some((permission) => allPermissions.has(permission));
}

/**
 * Require specific roles (middleware function)
 *
 * Usage in API route:
 * ```typescript
 * export async function POST(req: NextRequest) {
 *   const roleCheck = await requireRole('PHYSICIAN', 'ADMIN');
 *   if (roleCheck) return roleCheck;
 *
 *   // ... route logic ...
 * }
 * ```
 *
 * @param requiredRoles - Roles that have access
 * @returns NextResponse with 401/403 if unauthorized, null if authorized
 */
export async function requireRole(
  ...requiredRoles: UserRole[]
): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }

  const userRole = (session.user as any).role as UserRole;

  if (!userRole || !hasRole(userRole, requiredRoles)) {
    // Log access denial to audit trail
    await createAuditLog({
      action: 'READ', // Using READ for access attempts (no ACCESS_DENIED action in enum)
      resource: 'API',
      resourceId: 'access_denied',
      details: {
        requiredRoles,
        userRole,
        reason: 'Insufficient role privileges',
      },
      success: false,
    });

    return NextResponse.json(
      {
        error: `Forbidden - Required roles: ${requiredRoles.join(', ')}`,
        userRole,
      },
      { status: 403 }
    );
  }

  return null; // Authorized
}

/**
 * Require specific permissions (middleware function)
 *
 * Usage in API route:
 * ```typescript
 * export async function POST(req: NextRequest) {
 *   const permCheck = await requirePermission('patient:write', 'prescription:write');
 *   if (permCheck) return permCheck;
 *
 *   // ... route logic ...
 * }
 * ```
 *
 * @param requiredPermissions - Permissions needed (OR logic)
 * @returns NextResponse with 401/403 if unauthorized, null if authorized
 */
export async function requirePermission(
  ...requiredPermissions: Permission[]
): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }

  const userRole = (session.user as any).role as UserRole;
  const userPermissions = (session.user as any).permissions as string[] || [];

  if (!hasPermission(userRole, userPermissions, requiredPermissions)) {
    // Log access denial to audit trail
    await createAuditLog({
      action: 'READ', // Using READ for access attempts (no ACCESS_DENIED action in enum)
      resource: 'API',
      resourceId: 'permission_denied',
      details: {
        requiredPermissions,
        userRole,
        userPermissions,
        reason: 'Insufficient permissions',
      },
      success: false,
    });

    return NextResponse.json(
      {
        error: `Forbidden - Required permissions: ${requiredPermissions.join(', ')}`,
        userRole,
        userPermissions,
      },
      { status: 403 }
    );
  }

  return null; // Authorized
}

/**
 * Check if user can access specific patient (ownership check)
 *
 * @param userId - Current user ID
 * @param userRole - Current user role
 * @param patientId - Patient ID being accessed
 * @param patientProviderId - Patient's assigned provider ID
 * @returns true if user can access this patient
 */
export function canAccessPatient(
  userId: string,
  userRole: UserRole,
  patientId: string,
  patientProviderId?: string
): boolean {
  // Admins can access all patients
  if (userRole === 'ADMIN') {
    return true;
  }

  // Physicians/nurses can access their assigned patients
  if (userRole === 'PHYSICIAN' || userRole === 'NURSE' || userRole === 'CLINICIAN') {
    return patientProviderId === userId;
  }

  // Receptionists can view all patients (for scheduling)
  if (userRole === 'RECEPTIONIST' || userRole === 'STAFF') {
    return true; // Read-only access enforced by permissions
  }

  // Lab techs and pharmacists: limited access
  if (userRole === 'LAB_TECH' || userRole === 'PHARMACIST') {
    return true; // Limited to specific resources (enforced by permissions)
  }

  return false;
}

/**
 * Get user's effective permissions (role + custom)
 *
 * @param userRole - User's role
 * @param userPermissions - User's custom permissions
 * @returns Array of all permissions user has
 */
export function getEffectivePermissions(
  userRole: UserRole,
  userPermissions: string[]
): string[] {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  return Array.from(new Set([...rolePermissions, ...userPermissions]));
}
