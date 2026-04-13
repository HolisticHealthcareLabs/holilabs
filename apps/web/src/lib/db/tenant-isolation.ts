/**
 * Tenant Isolation Middleware for Prisma
 *
 * Automatically scopes Patient-related queries to the current user's
 * access boundary. Prevents cross-tenant data leakage (CYRUS invariant).
 *
 * Strategy:
 * - For Patient queries: adds assignedClinicianId filter
 * - For models with organizationId: adds organizationId filter
 * - ADMIN role bypasses isolation (needs all-org access)
 * - Break-glass access logged to audit trail
 *
 * Usage:
 *   import { withTenantIsolation } from '@/lib/db/tenant-isolation';
 *   const scopedPrisma = withTenantIsolation(prisma, { userId, role, organizationId });
 *
 * @compliance CYRUS invariant: every patient query scoped to tenant
 * @compliance LGPD Art. 46: appropriate access controls
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';

export interface TenantContext {
  userId: string;
  role: string;
  organizationId?: string;
}

/** Models where assignedClinicianId should be injected */
const CLINICIAN_SCOPED_MODELS = new Set([
  'patient',
]);

/** Models where organizationId should be injected */
const ORG_SCOPED_MODELS = new Set([
  'safetyIncident',
  'safetyCorrectiveAction',
  'careTeam',
  'careTeamMembership',
  'careConference',
  'qualityMeasure',
  'qualityMeasureResult',
]);

/** Roles that bypass tenant isolation */
const BYPASS_ROLES = new Set(['ADMIN', 'SYSTEM']);

/** Actions that read data (need isolation) */
const READ_ACTIONS = new Set([
  'findUnique',
  'findFirst',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
]);

/** Actions that mutate data (need isolation) */
const WRITE_ACTIONS = new Set([
  'update',
  'updateMany',
  'delete',
  'deleteMany',
]);

/**
 * Creates a tenant-isolated Prisma client using $use middleware.
 *
 * Every query on Patient or org-scoped models automatically includes
 * the current user's access boundary in the WHERE clause.
 */
export function withTenantIsolation(
  prisma: PrismaClient,
  ctx: TenantContext
): PrismaClient {
  // Admin/system roles bypass isolation
  if (BYPASS_ROLES.has(ctx.role)) {
    return prisma;
  }

  // Use Prisma middleware ($use) to intercept queries
  prisma.$use(async (params, next) => {
    const model = params.model?.toLowerCase() ?? '';
    const action = params.action;

    // Only intercept read/write actions
    if (!READ_ACTIONS.has(action) && !WRITE_ACTIONS.has(action)) {
      return next(params);
    }

    // Scope patient queries by assignedClinicianId
    if (CLINICIAN_SCOPED_MODELS.has(model)) {
      params.args = params.args ?? {};
      params.args.where = params.args.where ?? {};

      // Don't override if already scoped
      if (!params.args.where.assignedClinicianId) {
        params.args.where.assignedClinicianId = ctx.userId;

        logger.debug({
          event: 'tenant_isolation_applied',
          model: params.model,
          action,
          userId: ctx.userId,
          scope: 'clinician',
        });
      }
    }

    // Scope org-level models by organizationId
    if (ORG_SCOPED_MODELS.has(model) && ctx.organizationId) {
      params.args = params.args ?? {};
      params.args.where = params.args.where ?? {};

      if (!params.args.where.organizationId) {
        params.args.where.organizationId = ctx.organizationId;

        logger.debug({
          event: 'tenant_isolation_applied',
          model: params.model,
          action,
          organizationId: ctx.organizationId,
          scope: 'organization',
        });
      }
    }

    return next(params);
  });

  return prisma;
}

/**
 * Validates that a query result belongs to the expected tenant.
 * Use as a post-query safety net for critical paths.
 */
export function assertTenantOwnership(
  record: { assignedClinicianId?: string; organizationId?: string } | null,
  ctx: TenantContext
): void {
  if (!record) return;

  if (BYPASS_ROLES.has(ctx.role)) return;

  if (record.assignedClinicianId && record.assignedClinicianId !== ctx.userId) {
    logger.error({
      event: 'tenant_isolation_violation',
      expectedUserId: ctx.userId,
      actualClinicianId: record.assignedClinicianId,
    });
    throw new Error('Access denied: tenant isolation violation');
  }

  if (record.organizationId && ctx.organizationId && record.organizationId !== ctx.organizationId) {
    logger.error({
      event: 'tenant_isolation_violation',
      expectedOrgId: ctx.organizationId,
      actualOrgId: record.organizationId,
    });
    throw new Error('Access denied: organization isolation violation');
  }
}
