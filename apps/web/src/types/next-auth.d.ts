/**
 * NextAuth Type Extensions
 *
 * Extends NextAuth types to include custom user fields.
 * These fields flow: DB → authorize() → JWT → Session → Frontend
 */

import 'next-auth';
import 'next-auth/jwt';
import type { OrganizationType, TenantUserRole } from '../../../../packages/shared-kernel/src/types/auth';

declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    patientId?: string;
    role: string;
    tenantRole?: TenantUserRole;
    organizationId?: string;
    organizationName?: string;
    organizationType?: OrganizationType;
    workspaceRole?: string;
    username?: string | null;
    onboardingCompleted?: boolean;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      firstName?: string;
      lastName?: string;
      patientId?: string;
      role: string;
      tenantRole?: TenantUserRole;
      organizationId?: string;
      organizationName?: string;
      organizationType?: OrganizationType;
      workspaceRole?: string;
      username?: string | null;
      onboardingCompleted?: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    patientId: string;
    role: string;
    tenantRole?: TenantUserRole;
    organizationId?: string;
    organizationName?: string;
    organizationType?: OrganizationType;
    workspaceRole?: string;
    username?: string | null;
    onboardingCompleted?: boolean;
  }
}
