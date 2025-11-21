/**
 * Server-side authentication utilities
 * Use in Server Components, Server Actions, and API Route Handlers
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export interface CurrentUser {
  id: string;
  email: string;
  role: string;
  patientId: string | null; // Only for patients
}

/**
 * Get the current authenticated user
 * Returns null if no user is logged in
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = createClient() as any;

  const {
    data: { user },
  } = await supabase?.auth?.getUser() ?? { data: { user: null } };

  if (!user) {
    return null;
  }

  const role =
    user.user_metadata?.role ?? user.app_metadata?.role ?? 'PATIENT';

  return {
    id: user.id,
    email: user.email!,
    role,
    patientId: role === 'PATIENT' ? user.id : null,
  };
}

/**
 * Get the current authenticated user or redirect to login
 * Use in protected pages
 */
export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/login');
  }

  return user;
}

/**
 * Get the current patient ID
 * Only works for authenticated patients
 * Returns null for non-patient users
 */
export async function getCurrentPatientId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.patientId ?? null;
}

/**
 * Require a specific role
 * Redirects to login if not authenticated
 * Redirects to unauthorized if wrong role
 */
export async function requireRole(
  allowedRoles: string[]
): Promise<CurrentUser> {
  const user = await requireAuth();

  if (!allowedRoles.includes(user.role)) {
    redirect('/unauthorized');
  }

  return user;
}

/**
 * Check if user is authenticated (boolean)
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}
