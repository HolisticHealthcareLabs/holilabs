/**
 * Casbin RBAC Middleware
 *
 * SOC 2 Control: CC6.3 (Authorization & Principle of Least Privilege)
 *
 * Middleware functions for enforcing Casbin policies on API routes
 * and server actions in Next.js App Router.
 *
 * Integration Patterns:
 * 1. HOC (Higher-Order Component) for API routes
 * 2. Server action wrapper
 * 3. Manual enforcement in route handlers
 *
 * Example Usage:
 * ```typescript
 * export const GET = withCasbinCheck('patients', 'read')(async (request) => {
 *   // User is authorized, proceed with logic
 *   return Response.json({ patients });
 * });
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { enforce, getRolesForUser } from './casbin';
import { logger } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';

/**
 * Extract resource and action from Next.js route
 *
 * Maps URL patterns to Casbin resources:
 * - /api/patients → 'patients'
 * - /api/prescriptions/[id] → 'prescriptions'
 * - /api/consultations/[id]/notes → 'consultations'
 *
 * @param pathname - Request pathname
 * @returns Resource name
 */
function extractResourceFromPath(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);

  // /api/{resource}
  if (parts.length >= 2 && parts[0] === 'api') {
    return parts[1];
  }

  // Fallback to 'unknown'
  return 'unknown';
}

/**
 * Extract action from HTTP method
 *
 * Maps HTTP methods to Casbin actions:
 * - GET → 'read'
 * - POST → 'write'
 * - PUT/PATCH → 'write'
 * - DELETE → 'delete'
 *
 * @param method - HTTP method
 * @returns Action name
 */
function extractActionFromMethod(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':
    case 'HEAD':
      return 'read';
    case 'POST':
    case 'PUT':
    case 'PATCH':
      return 'write';
    case 'DELETE':
      return 'delete';
    default:
      return 'unknown';
  }
}

/**
 * Casbin enforcement result
 */
export interface EnforcementResult {
  allowed: boolean;
  userId: string | null;
  roles: string[];
  resource: string;
  action: string;
  domain: string;
}

/**
 * Check Casbin permission for current user
 *
 * Low-level function for manual enforcement.
 *
 * @param request - Next.js request
 * @param resource - Resource to access (e.g., 'patients')
 * @param action - Action to perform (e.g., 'read', 'write')
 * @param domain - Organization ID or '*'
 * @returns Enforcement result
 *
 * @example
 * ```typescript
 * const result = await checkPermission(request, 'patients', 'read');
 * if (!result.allowed) {
 *   return Response.json({ error: 'Forbidden' }, { status: 403 });
 * }
 * ```
 */
export async function checkPermission(
  request: NextRequest | Request,
  resource: string,
  action: string,
  domain: string = '*'
): Promise<EnforcementResult> {
  try {
    // Get current user session
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      logger.warn({
        event: 'casbin_check_no_session',
        resource,
        action,
      }, 'No session found for Casbin check');

      return {
        allowed: false,
        userId: null,
        roles: [],
        resource,
        action,
        domain,
      };
    }

    const userId = session.user.id;

    // Get user's roles
    const roles = await getRolesForUser(userId, domain);

    // Check permission for user ID directly
    let allowed = await enforce(userId, resource, action, domain);

    // If user doesn't have direct permission, check role permissions
    if (!allowed && roles.length > 0) {
      for (const role of roles) {
        allowed = await enforce(role, resource, action, domain);
        if (allowed) break;
      }
    }

    logger.info({
      event: 'casbin_permission_check',
      userId,
      roles,
      resource,
      action,
      domain,
      allowed,
    }, `Permission check: ${allowed ? 'ALLOWED' : 'DENIED'}`);

    // Audit log for denied access
    if (!allowed) {
      await createAuditLog({
        action: 'READ',
        resource,
        resourceId: 'PERMISSION_DENIED',
        details: {
          userId,
          roles,
          requestedAction: action,
          domain,
        },
        success: false,
        errorMessage: 'Insufficient permissions',
      });
    }

    return {
      allowed,
      userId,
      roles,
      resource,
      action,
      domain,
    };
  } catch (error) {
    logger.error({
      event: 'casbin_check_permission_failed',
      resource,
      action,
      domain,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Casbin permission check failed');

    // Fail-closed: Deny on error
    return {
      allowed: false,
      userId: null,
      roles: [],
      resource,
      action,
      domain,
    };
  }
}

/**
 * Higher-Order Component for API routes with Casbin enforcement
 *
 * Wraps API route handlers with automatic permission checking.
 *
 * @param resource - Resource to protect (e.g., 'patients')
 * @param action - Action to enforce (e.g., 'read', 'write')
 * @param domain - Organization ID or '*'
 * @returns Wrapped handler
 *
 * @example
 * ```typescript
 * // Protect GET /api/patients (requires 'patients:read' permission)
 * export const GET = withCasbinCheck('patients', 'read')(async (request) => {
 *   const patients = await prisma.patient.findMany();
 *   return Response.json({ patients });
 * });
 *
 * // Protect POST /api/prescriptions (requires 'prescriptions:write' permission)
 * export const POST = withCasbinCheck('prescriptions', 'write')(async (request) => {
 *   const data = await request.json();
 *   const prescription = await prisma.prescription.create({ data });
 *   return Response.json({ prescription });
 * });
 * ```
 */
export function withCasbinCheck(
  resource: string,
  action: string,
  domain: string = '*'
) {
  return function (
    handler: (
      request: NextRequest | Request,
      context?: { params?: any }
    ) => Promise<Response> | Response
  ) {
    return async function (
      request: NextRequest | Request,
      context?: { params?: any }
    ): Promise<Response> {
      // Check permission
      const result = await checkPermission(request, resource, action, domain);

      if (!result.allowed) {
        logger.warn({
          event: 'casbin_access_denied',
          userId: result.userId,
          roles: result.roles,
          resource,
          action,
          domain,
        }, 'Access denied by Casbin policy');

        return NextResponse.json(
          {
            error: 'Forbidden',
            message: 'You do not have permission to access this resource',
            required: {
              resource,
              action,
            },
          },
          { status: 403 }
        );
      }

      // Permission granted, proceed with handler
      return handler(request, context);
    };
  };
}

/**
 * Auto-detect resource and action from request
 *
 * Convenience HOC that automatically extracts resource from URL
 * and action from HTTP method.
 *
 * @param domain - Organization ID or '*'
 * @returns Wrapped handler
 *
 * @example
 * ```typescript
 * // Auto-detects 'patients' resource and 'read' action from GET /api/patients
 * export const GET = withAutoCasbinCheck()(async (request) => {
 *   const patients = await prisma.patient.findMany();
 *   return Response.json({ patients });
 * });
 * ```
 */
export function withAutoCasbinCheck(domain: string = '*') {
  return function (
    handler: (
      request: NextRequest | Request,
      context?: { params?: any }
    ) => Promise<Response> | Response
  ) {
    return async function (
      request: NextRequest | Request,
      context?: { params?: any }
    ): Promise<Response> {
      // Extract resource from URL
      const url = 'url' in request ? request.url : (request as NextRequest).nextUrl.toString();
      const pathname = new URL(url).pathname;
      const resource = extractResourceFromPath(pathname);

      // Extract action from HTTP method
      const method = request.method;
      const action = extractActionFromMethod(method);

      logger.debug({
        event: 'casbin_auto_detect',
        pathname,
        method,
        resource,
        action,
      }, 'Auto-detected resource and action');

      // Check permission
      const result = await checkPermission(request, resource, action, domain);

      if (!result.allowed) {
        logger.warn({
          event: 'casbin_access_denied',
          userId: result.userId,
          roles: result.roles,
          resource,
          action,
          domain,
        }, 'Access denied by Casbin policy');

        return NextResponse.json(
          {
            error: 'Forbidden',
            message: 'You do not have permission to access this resource',
            required: {
              resource,
              action,
            },
          },
          { status: 403 }
        );
      }

      // Permission granted, proceed with handler
      return handler(request, context);
    };
  };
}

/**
 * Server action wrapper with Casbin enforcement
 *
 * For use in Server Components and form actions.
 *
 * @param resource - Resource to protect
 * @param action - Action to enforce
 * @param domain - Organization ID or '*'
 * @param handler - Server action function
 * @returns Wrapped handler
 *
 * @example
 * ```typescript
 * 'use server';
 *
 * export const updatePatient = enforceCasbinAction(
 *   'patients',
 *   'write',
 *   '*',
 *   async (patientId: string, data: any) => {
 *     return await prisma.patient.update({
 *       where: { id: patientId },
 *       data,
 *     });
 *   }
 * );
 * ```
 */
export function enforceCasbinAction<TArgs extends any[], TReturn>(
  resource: string,
  action: string,
  domain: string = '*',
  handler: (...args: TArgs) => Promise<TReturn>
) {
  return async function (...args: TArgs): Promise<TReturn> {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new Error('Unauthorized: No session found');
    }

    const userId = session.user.id;
    const roles = await getRolesForUser(userId, domain);

    // Check permission
    let allowed = await enforce(userId, resource, action, domain);

    if (!allowed && roles.length > 0) {
      for (const role of roles) {
        allowed = await enforce(role, resource, action, domain);
        if (allowed) break;
      }
    }

    if (!allowed) {
      logger.warn({
        event: 'casbin_server_action_denied',
        userId,
        roles,
        resource,
        action,
        domain,
      }, 'Server action denied by Casbin policy');

      // Audit log
      await createAuditLog({
        action: 'ACCESS',
        resource,
        resourceId: 'SERVER_ACTION_DENIED',
        details: {
          userId,
          roles,
          requestedAction: action,
          domain,
        },
        success: false,
        errorMessage: 'Insufficient permissions',
      });

      throw new Error(`Forbidden: You do not have permission to ${action} ${resource}`);
    }

    // Permission granted, execute handler
    return handler(...args);
  };
}

/**
 * Require specific role(s) for access
 *
 * Convenience function for role-based checks (not policy-based).
 *
 * @param requiredRoles - Array of required roles (user must have at least one)
 * @param domain - Organization ID or '*'
 * @returns Wrapped handler
 *
 * @example
 * ```typescript
 * // Only ADMIN and PHYSICIAN can access
 * export const GET = requireRoles(['ADMIN', 'PHYSICIAN'])(async (request) => {
 *   // Handler logic
 * });
 * ```
 */
export function requireRoles(requiredRoles: string[], domain: string = '*') {
  return function (
    handler: (
      request: NextRequest | Request,
      context?: { params?: any }
    ) => Promise<Response> | Response
  ) {
    return async function (
      request: NextRequest | Request,
      context?: { params?: any }
    ): Promise<Response> {
      const session = await getServerSession(authOptions);

      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        );
      }

      const userId = session.user.id;
      const userRoles = await getRolesForUser(userId, domain);

      // Check if user has any of the required roles
      const hasRequiredRole = requiredRoles.some((role) => userRoles.includes(role));

      if (!hasRequiredRole) {
        logger.warn({
          event: 'casbin_role_check_failed',
          userId,
          userRoles,
          requiredRoles,
          domain,
        }, 'User does not have required role');

        // Audit log
        await createAuditLog({
          action: 'ACCESS',
          resource: 'ROLE_CHECK',
          resourceId: userId,
          details: {
            userRoles,
            requiredRoles,
            domain,
          },
          success: false,
          errorMessage: 'Insufficient role',
        });

        return NextResponse.json(
          {
            error: 'Forbidden',
            message: `Required role: ${requiredRoles.join(' or ')}`,
          },
          { status: 403 }
        );
      }

      // Role check passed
      return handler(request, context);
    };
  };
}
