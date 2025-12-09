/**
 * Casbin RBAC Integration
 *
 * SOC 2 Control: CC6.3 (Authorization & Principle of Least Privilege)
 *
 * Centralized policy-based access control using Casbin.
 * Replaces ad-hoc RBAC checks throughout the codebase with
 * a unified, auditable, and testable authorization system.
 *
 * Features:
 * - Role-Based Access Control (RBAC)
 * - Role Hierarchy (ADMIN inherits PHYSICIAN permissions)
 * - Attribute-Based Access Control (ABAC)
 * - Multi-tenancy with domains (organizations)
 * - Policy versioning and audit trail
 *
 * Example Usage:
 * ```typescript
 * // Check permission
 * const allowed = await enforce('user_123', 'patients', 'read', 'org_456');
 *
 * // Add role
 * await addRoleForUser('user_123', 'PHYSICIAN', 'org_456');
 *
 * // Check role
 * const hasRole = await hasRoleForUser('user_123', 'PHYSICIAN', 'org_456');
 * ```
 */

import { newEnforcer, Enforcer } from 'casbin';
import { newAdapter, PrismaAdapter } from './casbin-adapter';
import { logger } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import path from 'path';

// Model file path
const MODEL_PATH = path.join(process.cwd(), 'apps/web/config/casbin-model.conf');

// Singleton enforcer instance
let enforcerInstance: Enforcer | null = null;

/**
 * Get or create Casbin enforcer
 *
 * Lazy initialization with caching.
 */
export async function getEnforcer(): Promise<Enforcer> {
  if (!enforcerInstance) {
    try {
      logger.info({ event: 'casbin_enforcer_init_started' }, 'Initializing Casbin enforcer');

      const adapter = await newAdapter();
      enforcerInstance = await newEnforcer(MODEL_PATH, adapter);

      logger.info({ event: 'casbin_enforcer_init_completed' }, 'Casbin enforcer initialized successfully');
    } catch (error) {
      logger.error({
        event: 'casbin_enforcer_init_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to initialize Casbin enforcer');

      throw new Error(`Failed to initialize Casbin: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return enforcerInstance;
}

/**
 * Clear enforcer cache (force reload)
 *
 * Call this after bulk policy updates.
 */
export function clearEnforcerCache(): void {
  enforcerInstance = null;
  logger.info({ event: 'casbin_enforcer_cache_cleared' }, 'Casbin enforcer cache cleared');
}

/**
 * Enforce permission check
 *
 * Core authorization function. Checks if a subject (user/role) can
 * perform an action on an object (resource) within a domain.
 *
 * @param subject - User ID or role (e.g., 'user_123' or 'PHYSICIAN')
 * @param object - Resource (e.g., 'patients', 'prescriptions')
 * @param action - Action (e.g., 'read', 'write', 'delete')
 * @param domain - Organization ID or '*' for global
 * @returns True if allowed
 *
 * @example
 * ```typescript
 * const canRead = await enforce('user_123', 'patients', 'read', 'org_456');
 * if (!canRead) {
 *   throw new Error('Forbidden');
 * }
 * ```
 */
export async function enforce(
  subject: string,
  object: string,
  action: string,
  domain: string = '*'
): Promise<boolean> {
  try {
    const enforcer = await getEnforcer();

    const allowed = await enforcer.enforce(subject, object, action, domain);

    logger.debug({
      event: 'casbin_enforce',
      subject,
      object,
      action,
      domain,
      allowed,
    }, `Permission check: ${allowed ? 'ALLOWED' : 'DENIED'}`);

    return allowed;
  } catch (error) {
    logger.error({
      event: 'casbin_enforce_failed',
      subject,
      object,
      action,
      domain,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Casbin enforcement check failed');

    // Fail-closed: Deny access on error
    return false;
  }
}

/**
 * Batch enforce (check multiple permissions at once)
 *
 * More efficient than calling enforce() multiple times.
 *
 * @param requests - Array of [subject, object, action, domain] tuples
 * @returns Array of boolean results
 *
 * @example
 * ```typescript
 * const results = await batchEnforce([
 *   ['user_123', 'patients', 'read', 'org_456'],
 *   ['user_123', 'patients', 'write', 'org_456'],
 *   ['user_123', 'prescriptions', 'write', 'org_456'],
 * ]);
 * // [true, false, true]
 * ```
 */
export async function batchEnforce(
  requests: Array<[string, string, string, string?]>
): Promise<boolean[]> {
  try {
    const enforcer = await getEnforcer();

    // Casbin's batchEnforce expects exactly 4 elements per request
    const normalizedRequests = requests.map((req) => {
      const [subject, object, action, domain = '*'] = req;
      return [subject, object, action, domain];
    });

    const results = await enforcer.batchEnforce(normalizedRequests);

    logger.debug({
      event: 'casbin_batch_enforce',
      requestCount: requests.length,
      allowedCount: results.filter(Boolean).length,
    }, 'Batch permission check completed');

    return results;
  } catch (error) {
    logger.error({
      event: 'casbin_batch_enforce_failed',
      requestCount: requests.length,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Casbin batch enforcement failed');

    // Fail-closed: Deny all on error
    return new Array(requests.length).fill(false);
  }
}

/**
 * Add a role to a user
 *
 * Assigns a role to a user within a specific domain (organization).
 *
 * @param userId - User ID
 * @param role - Role name (e.g., 'PHYSICIAN', 'ADMIN')
 * @param domain - Organization ID or '*' for global
 *
 * @example
 * ```typescript
 * await addRoleForUser('user_123', 'PHYSICIAN', 'org_456');
 * ```
 */
export async function addRoleForUser(
  userId: string,
  role: string,
  domain: string = '*'
): Promise<void> {
  try {
    const enforcer = await getEnforcer();

    await enforcer.addRoleForUser(userId, role, domain);

    logger.info({
      event: 'casbin_role_added',
      userId,
      role,
      domain,
    }, 'Role added to user');

    // Audit log
    await createAuditLog({
      action: 'CREATE',
      resource: 'UserRole',
      resourceId: userId,
      details: {
        role,
        domain,
      },
      success: true,
    });
  } catch (error) {
    logger.error({
      event: 'casbin_add_role_failed',
      userId,
      role,
      domain,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to add role to user');

    throw error;
  }
}

/**
 * Remove a role from a user
 *
 * @param userId - User ID
 * @param role - Role name
 * @param domain - Organization ID or '*' for global
 */
export async function deleteRoleForUser(
  userId: string,
  role: string,
  domain: string = '*'
): Promise<void> {
  try {
    const enforcer = await getEnforcer();

    await enforcer.deleteRoleForUser(userId, role, domain);

    logger.info({
      event: 'casbin_role_removed',
      userId,
      role,
      domain,
    }, 'Role removed from user');

    // Audit log
    await createAuditLog({
      action: 'DELETE',
      resource: 'UserRole',
      resourceId: userId,
      details: {
        role,
        domain,
      },
      success: true,
    });
  } catch (error) {
    logger.error({
      event: 'casbin_remove_role_failed',
      userId,
      role,
      domain,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to remove role from user');

    throw error;
  }
}

/**
 * Check if user has a specific role
 *
 * @param userId - User ID
 * @param role - Role name
 * @param domain - Organization ID or '*' for global
 * @returns True if user has the role
 */
export async function hasRoleForUser(
  userId: string,
  role: string,
  domain: string = '*'
): Promise<boolean> {
  try {
    const enforcer = await getEnforcer();

    const hasRole = await enforcer.hasRoleForUser(userId, role, domain);

    logger.debug({
      event: 'casbin_check_role',
      userId,
      role,
      domain,
      hasRole,
    }, `Role check: user ${hasRole ? 'HAS' : 'DOES NOT HAVE'} role`);

    return hasRole;
  } catch (error) {
    logger.error({
      event: 'casbin_check_role_failed',
      userId,
      role,
      domain,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to check user role');

    return false;
  }
}

/**
 * Get all roles for a user
 *
 * @param userId - User ID
 * @param domain - Organization ID or '*' for global
 * @returns Array of role names
 */
export async function getRolesForUser(
  userId: string,
  domain?: string
): Promise<string[]> {
  try {
    const enforcer = await getEnforcer();

    const roles = domain
      ? await enforcer.getRolesForUser(userId, domain)
      : await enforcer.getRolesForUser(userId);

    logger.debug({
      event: 'casbin_get_roles',
      userId,
      domain,
      roles,
    }, 'Retrieved user roles');

    return roles;
  } catch (error) {
    logger.error({
      event: 'casbin_get_roles_failed',
      userId,
      domain,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to get user roles');

    return [];
  }
}

/**
 * Get all users with a specific role
 *
 * @param role - Role name
 * @param domain - Organization ID or '*' for global
 * @returns Array of user IDs
 */
export async function getUsersForRole(
  role: string,
  domain?: string
): Promise<string[]> {
  try {
    const enforcer = await getEnforcer();

    const users = domain
      ? await enforcer.getUsersForRole(role, domain)
      : await enforcer.getUsersForRole(role);

    logger.debug({
      event: 'casbin_get_users_for_role',
      role,
      domain,
      userCount: users.length,
    }, 'Retrieved users for role');

    return users;
  } catch (error) {
    logger.error({
      event: 'casbin_get_users_for_role_failed',
      role,
      domain,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to get users for role');

    return [];
  }
}

/**
 * Add a policy
 *
 * Low-level function to add a policy rule.
 * Use enforce() to check policies after adding.
 *
 * @param subject - Subject (role or user)
 * @param object - Object (resource)
 * @param action - Action (read, write, delete)
 * @param domain - Domain (organization ID)
 * @param effect - Effect (allow, deny)
 *
 * @example
 * ```typescript
 * // Allow PHYSICIAN to read patients in any org
 * await addPolicy('PHYSICIAN', 'patients', 'read', '*', 'allow');
 *
 * // Deny RECEPTIONIST from deleting patients
 * await addPolicy('RECEPTIONIST', 'patients', 'delete', '*', 'deny');
 * ```
 */
export async function addPolicy(
  subject: string,
  object: string,
  action: string,
  domain: string = '*',
  effect: 'allow' | 'deny' = 'allow'
): Promise<void> {
  try {
    const enforcer = await getEnforcer();

    await enforcer.addPolicy(subject, object, action, domain, effect);

    logger.info({
      event: 'casbin_policy_added',
      subject,
      object,
      action,
      domain,
      effect,
    }, 'Policy added');

    // Audit log
    await createAuditLog({
      action: 'CREATE',
      resource: 'CasbinPolicy',
      resourceId: `${subject}:${object}:${action}`,
      details: {
        subject,
        object,
        action,
        domain,
        effect,
      },
      success: true,
    });
  } catch (error) {
    logger.error({
      event: 'casbin_add_policy_failed',
      subject,
      object,
      action,
      domain,
      effect,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to add policy');

    throw error;
  }
}

/**
 * Remove a policy
 *
 * @param subject - Subject (role or user)
 * @param object - Object (resource)
 * @param action - Action
 * @param domain - Domain
 * @param effect - Effect
 */
export async function removePolicy(
  subject: string,
  object: string,
  action: string,
  domain: string = '*',
  effect: 'allow' | 'deny' = 'allow'
): Promise<void> {
  try {
    const enforcer = await getEnforcer();

    await enforcer.removePolicy(subject, object, action, domain, effect);

    logger.info({
      event: 'casbin_policy_removed',
      subject,
      object,
      action,
      domain,
      effect,
    }, 'Policy removed');

    // Audit log
    await createAuditLog({
      action: 'DELETE',
      resource: 'CasbinPolicy',
      resourceId: `${subject}:${object}:${action}`,
      details: {
        subject,
        object,
        action,
        domain,
        effect,
      },
      success: true,
    });
  } catch (error) {
    logger.error({
      event: 'casbin_remove_policy_failed',
      subject,
      object,
      action,
      domain,
      effect,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to remove policy');

    throw error;
  }
}

/**
 * Get all policies
 *
 * Returns all policy rules in the system.
 *
 * @returns Array of policy rules
 */
export async function getAllPolicies(): Promise<string[][]> {
  try {
    const enforcer = await getEnforcer();

    const policies = await enforcer.getPolicy();

    logger.debug({
      event: 'casbin_get_all_policies',
      policyCount: policies.length,
    }, 'Retrieved all policies');

    return policies;
  } catch (error) {
    logger.error({
      event: 'casbin_get_all_policies_failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to get all policies');

    return [];
  }
}

/**
 * Initialize default policies
 *
 * Sets up default RBAC policies for Holi Labs roles.
 * Call this once during application setup.
 *
 * @example
 * ```typescript
 * await initializeDefaultPolicies();
 * ```
 */
export async function initializeDefaultPolicies(): Promise<void> {
  try {
    logger.info({ event: 'casbin_init_default_policies_started' }, 'Initializing default Casbin policies');

    const enforcer = await getEnforcer();

    // ========== ROLE HIERARCHY ==========
    // ADMIN inherits all PHYSICIAN permissions
    await enforcer.addRoleForUser('ADMIN', 'PHYSICIAN', '*');

    // ========== PHYSICIAN PERMISSIONS ==========
    await enforcer.addPolicy('PHYSICIAN', 'patients', 'read', '*', 'allow');
    await enforcer.addPolicy('PHYSICIAN', 'patients', 'write', '*', 'allow');
    await enforcer.addPolicy('PHYSICIAN', 'patients', 'delete', '*', 'allow');
    await enforcer.addPolicy('PHYSICIAN', 'prescriptions', 'read', '*', 'allow');
    await enforcer.addPolicy('PHYSICIAN', 'prescriptions', 'write', '*', 'allow');
    await enforcer.addPolicy('PHYSICIAN', 'consultations', 'read', '*', 'allow');
    await enforcer.addPolicy('PHYSICIAN', 'consultations', 'write', '*', 'allow');
    await enforcer.addPolicy('PHYSICIAN', 'lab-results', 'read', '*', 'allow');
    await enforcer.addPolicy('PHYSICIAN', 'lab-results', 'write', '*', 'allow');

    // ========== CLINICIAN PERMISSIONS ==========
    await enforcer.addPolicy('CLINICIAN', 'patients', 'read', '*', 'allow');
    await enforcer.addPolicy('CLINICIAN', 'patients', 'write', '*', 'allow');
    await enforcer.addPolicy('CLINICIAN', 'consultations', 'read', '*', 'allow');
    await enforcer.addPolicy('CLINICIAN', 'consultations', 'write', '*', 'allow');
    await enforcer.addPolicy('CLINICIAN', 'prescriptions', 'read', '*', 'allow');

    // ========== NURSE PERMISSIONS ==========
    await enforcer.addPolicy('NURSE', 'patients', 'read', '*', 'allow');
    await enforcer.addPolicy('NURSE', 'consultations', 'read', '*', 'allow');
    await enforcer.addPolicy('NURSE', 'prescriptions', 'read', '*', 'allow');
    await enforcer.addPolicy('NURSE', 'lab-results', 'read', '*', 'allow');

    // ========== RECEPTIONIST PERMISSIONS ==========
    await enforcer.addPolicy('RECEPTIONIST', 'patients', 'read', '*', 'allow');
    await enforcer.addPolicy('RECEPTIONIST', 'patients', 'write', '*', 'allow');
    await enforcer.addPolicy('RECEPTIONIST', 'appointments', 'read', '*', 'allow');
    await enforcer.addPolicy('RECEPTIONIST', 'appointments', 'write', '*', 'allow');
    await enforcer.addPolicy('RECEPTIONIST', 'appointments', 'delete', '*', 'allow');

    // ========== LAB TECH PERMISSIONS ==========
    await enforcer.addPolicy('LAB_TECH', 'patients', 'read', '*', 'allow');
    await enforcer.addPolicy('LAB_TECH', 'lab-results', 'read', '*', 'allow');
    await enforcer.addPolicy('LAB_TECH', 'lab-results', 'write', '*', 'allow');

    // ========== PHARMACIST PERMISSIONS ==========
    await enforcer.addPolicy('PHARMACIST', 'patients', 'read', '*', 'allow');
    await enforcer.addPolicy('PHARMACIST', 'prescriptions', 'read', '*', 'allow');
    await enforcer.addPolicy('PHARMACIST', 'prescriptions', 'write', '*', 'allow');

    // ========== STAFF PERMISSIONS ==========
    await enforcer.addPolicy('STAFF', 'patients', 'read', '*', 'allow');

    logger.info({ event: 'casbin_init_default_policies_completed' }, 'Default Casbin policies initialized');
  } catch (error) {
    logger.error({
      event: 'casbin_init_default_policies_failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to initialize default policies');

    throw error;
  }
}

/**
 * Health check for Casbin
 *
 * @returns Health status
 */
export async function checkCasbinHealth(): Promise<{
  healthy: boolean;
  policyCount?: number;
  error?: string;
}> {
  try {
    const enforcer = await getEnforcer();

    const policies = await enforcer.getPolicy();
    const roles = await enforcer.getGroupingPolicy();

    return {
      healthy: true,
      policyCount: policies.length + roles.length,
    };
  } catch (error) {
    logger.error({
      event: 'casbin_health_check_failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Casbin health check failed');

    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
