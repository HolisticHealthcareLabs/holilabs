import type { OrganizationId } from '../../index';

export type OrganizationType = 'CLINIC' | 'HOSPITAL';
export type TenantUserRole = 'ORG_ADMIN' | 'CLINICIAN' | 'BILLING';

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
}

export interface AuthOrganizationContext {
  organizationId: string;
  organizationName: string;
  organizationType: OrganizationType;
  tenantRole: TenantUserRole;
}

export function normalizeTenantRole(params: {
  userRole?: string | null;
  workspaceRole?: string | null;
}): TenantUserRole {
  const userRole = params.userRole?.toUpperCase() ?? '';
  const workspaceRole = params.workspaceRole?.toUpperCase() ?? '';

  if (workspaceRole === 'OWNER' || workspaceRole === 'ADMIN' || userRole === 'ADMIN') {
    return 'ORG_ADMIN';
  }

  if (userRole === 'RECEPTIONIST' || userRole === 'STAFF') {
    return 'BILLING';
  }

  return 'CLINICIAN';
}

export function buildOrganization(params: {
  organizationId: string;
  organizationName?: string | null;
  organizationType?: OrganizationType;
}): Organization {
  return {
    id: params.organizationId,
    name: params.organizationName?.trim() || 'Default Organization',
    type: params.organizationType ?? 'CLINIC',
  };
}

export function filterRecordsForOrganization<T extends { organizationId: string }>(
  records: readonly T[],
  organizationId: string | OrganizationId
): T[] {
  return records.filter((record) => record.organizationId === organizationId);
}
