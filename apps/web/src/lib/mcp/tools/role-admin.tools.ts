/**
 * Role Admin MCP Tools - RBAC management for agents
 *
 * Enforces CYRUS invariant: LICENSE_OWNER and COMPLIANCE_ADMIN roles
 * cannot be granted via agent (human-only actions).
 *
 * Tools:
 * - list_role_assignments: Filter by userId/role, optional includeRevoked flag
 * - grant_role: Create role assignment with grantorId + grantedAt
 * - revoke_role: Set revokedAt + verify not already revoked
 *
 * All require ['admin:write'] permission.
 * All use Zod input schemas.
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { MCPContext, MCPResult, MCPTool } from '../types';

// =============================================================================
// VETO ERROR CLASS
// =============================================================================

export class CyrusVetoError extends Error {
  constructor(
    public invariantViolated: string,
    public proposedAction: string,
    public requiredChange: string,
  ) {
    super(`[VETO — CYRUS] ${invariantViolated}`);
    this.name = 'CyrusVetoError';
  }
}

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const ListRoleAssignmentsSchema = z.object({
  userId: z.string().uuid().optional().describe('Filter by user ID'),
  role: z.string().optional().describe('Filter by role name'),
  includeRevoked: z.boolean().optional().default(false).describe('Include revoked assignments'),
});

const GrantRoleSchema = z.object({
  granteeId: z.string().uuid().describe('User ID to grant role to'),
  role: z.string().describe('Role name to grant (e.g., PHYSICIAN, ADMIN)'),
  scope: z.string().optional().describe('Optional scope (e.g., clinic ID)'),
});

const RevokeRoleSchema = z.object({
  assignmentId: z.string().describe('Role assignment ID to revoke'),
});

type ListRoleAssignmentsInput = z.infer<typeof ListRoleAssignmentsSchema>;
type GrantRoleInput = z.infer<typeof GrantRoleSchema>;
type RevokeRoleInput = z.infer<typeof RevokeRoleSchema>;

// =============================================================================
// HANDLER: list_role_assignments
// =============================================================================

async function listRoleAssignmentsHandler(
  input: ListRoleAssignmentsInput,
  context: MCPContext,
): Promise<MCPResult> {
  const where: any = {};

  if (input.userId) {
    where.granteeId = input.userId;
  }

  if (input.role) {
    where.role = input.role;
  }

  // By default, exclude revoked (revokedAt IS NULL)
  if (!input.includeRevoked) {
    where.revokedAt = null;
  }

  const assignments: any = await prisma.roleAssignment.findMany({
    where,
    include: {
      grantee: { select: { id: true, email: true, firstName: true, lastName: true } },
      grantor: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
    orderBy: { grantedAt: 'desc' },
  });

  logger.info({
    event: 'mcp_tool_executed',
    tool: 'list_role_assignments',
    agentId: context.agentId,
    clinicianId: context.clinicianId,
    assignmentCount: assignments.length,
  });

  return {
    success: true,
    data: {
      assignments: assignments.map((a: any) => ({
        id: a.id,
        granteeId: a.granteeId,
        granteeName: `${a.grantee.firstName} ${a.grantee.lastName}`.trim() || a.grantee.email,
        role: a.role,
        scope: a.scope,
        grantedAt: a.grantedAt.toISOString(),
        revokedAt: a.revokedAt?.toISOString() || null,
        grantorEmail: a.grantor.email,
      })),
      total: assignments.length,
    },
  };
}

// =============================================================================
// HANDLER: grant_role
// CYRUS VETO: Cannot grant LICENSE_OWNER or COMPLIANCE_ADMIN
// =============================================================================

async function grantRoleHandler(
  input: GrantRoleInput,
  context: MCPContext,
): Promise<MCPResult> {
  // CYRUS VETO: Deny LICENSE_OWNER and COMPLIANCE_ADMIN
  if (input.role === 'LICENSE_OWNER') {
    throw new CyrusVetoError(
      'LICENSE_OWNER role cannot be granted via agent',
      `Attempting to grant LICENSE_OWNER to ${input.granteeId}`,
      'Only human administrators may grant LICENSE_OWNER role',
    );
  }

  if (input.role === 'COMPLIANCE_ADMIN') {
    throw new CyrusVetoError(
      'COMPLIANCE_ADMIN role cannot be granted via agent',
      `Attempting to grant COMPLIANCE_ADMIN to ${input.granteeId}`,
      'Only human administrators may grant COMPLIANCE_ADMIN role',
    );
  }

  // Check if grantee exists
  const grantee: any = await prisma.user.findUnique({
    where: { id: input.granteeId },
    select: { id: true, email: true, firstName: true, lastName: true },
  });

  if (!grantee) {
    return {
      success: false,
      error: `User not found: ${input.granteeId}`,
      data: null,
    };
  }

  // Create role assignment
  const assignment: any = await prisma.roleAssignment.create({
    data: {
      granteeId: input.granteeId,
      grantorId: context.clinicianId,
      role: input.role as any,
      scope: input.scope,
      grantedAt: new Date(),
    },
    include: {
      grantee: { select: { id: true, email: true, firstName: true, lastName: true } },
      grantor: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });

  logger.info({
    event: 'mcp_role_granted',
    tool: 'grant_role',
    assignmentId: assignment.id,
    granteeId: assignment.granteeId,
    role: assignment.role,
    grantorId: context.clinicianId,
    agentId: context.agentId,
  });

  return {
    success: true,
    data: {
      assignmentId: assignment.id,
      granteeId: assignment.granteeId,
      granteeName: assignment.grantee.name || assignment.grantee.email,
      role: assignment.role,
      scope: assignment.scope,
      grantedAt: assignment.grantedAt.toISOString(),
      grantorEmail: assignment.grantor.email,
      message: `Role ${assignment.role} granted to ${assignment.grantee.email}`,
    },
  };
}

// =============================================================================
// HANDLER: revoke_role
// Verify not already revoked; set revokedAt
// =============================================================================

async function revokeRoleHandler(
  input: RevokeRoleInput,
  context: MCPContext,
): Promise<MCPResult> {
  // Find assignment
  const assignment: any = await prisma.roleAssignment.findUnique({
    where: { id: input.assignmentId },
    include: {
      grantee: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });

  if (!assignment) {
    return {
      success: false,
      error: `Role assignment not found: ${input.assignmentId}`,
      data: null,
    };
  }

  // Verify not already revoked
  if (assignment.revokedAt) {
    return {
      success: false,
      error: `Role assignment already revoked at ${assignment.revokedAt.toISOString()}`,
      data: null,
    };
  }

  // Revoke
  const revoked: any = await prisma.roleAssignment.update({
    where: { id: input.assignmentId },
    data: {
      revokedAt: new Date(),
    },
    include: {
      grantee: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });

  logger.info({
    event: 'mcp_role_revoked',
    tool: 'revoke_role',
    assignmentId: revoked.id,
    granteeId: revoked.granteeId,
    role: revoked.role,
    revokedAt: revoked.revokedAt.toISOString(),
    agentId: context.agentId,
    clinicianId: context.clinicianId,
  });

  return {
    success: true,
    data: {
      assignmentId: revoked.id,
      granteeId: revoked.granteeId,
      granteeName: revoked.grantee.name || revoked.grantee.email,
      role: revoked.role,
      revokedAt: revoked.revokedAt.toISOString(),
      message: `Role ${revoked.role} revoked from ${revoked.grantee.email}`,
    },
  };
}

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

const listRoleAssignmentsTool: MCPTool = {
  name: 'list_role_assignments',
  description: 'List role assignments with optional filtering and revocation status',
  category: 'admin',
  inputSchema: ListRoleAssignmentsSchema,
  requiredPermissions: ['admin:write'],
  handler: listRoleAssignmentsHandler,
  examples: [
    {
      description: 'List all active role assignments',
      input: {},
    },
    {
      description: 'List assignments for a specific user',
      input: { userId: 'user-123' },
    },
    {
      description: 'List all PHYSICIAN role assignments including revoked',
      input: { role: 'PHYSICIAN', includeRevoked: true },
    },
  ],
};

const grantRoleTool: MCPTool = {
  name: 'grant_role',
  description: 'Grant a role to a user (CYRUS veto: LICENSE_OWNER and COMPLIANCE_ADMIN require human approval)',
  category: 'admin',
  inputSchema: GrantRoleSchema,
  requiredPermissions: ['admin:write'],
  handler: grantRoleHandler,
  examples: [
    {
      description: 'Grant PHYSICIAN role to user',
      input: { granteeId: 'user-456', role: 'PHYSICIAN' },
    },
    {
      description: 'Grant ADMIN role with clinic scope',
      input: { granteeId: 'user-789', role: 'ADMIN', scope: 'clinic-1' },
    },
  ],
};

const revokeRoleTool: MCPTool = {
  name: 'revoke_role',
  description: 'Revoke a previously granted role assignment',
  category: 'admin',
  inputSchema: RevokeRoleSchema,
  requiredPermissions: ['admin:write'],
  handler: revokeRoleHandler,
  examples: [
    {
      description: 'Revoke a role assignment',
      input: { assignmentId: 'assignment-123' },
    },
  ],
};

// =============================================================================
// EXPORT
// =============================================================================

export const roleAdminTools: MCPTool[] = [
  listRoleAssignmentsTool,
  grantRoleTool,
  revokeRoleTool,
];
