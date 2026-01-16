/**
 * NextAuth v5 Instance
 *
 * Exports auth handlers and helper functions
 */

import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

// Export HTTP handlers for API route
export const { GET, POST } = handlers;

/**
 * Get current session (server-side only)
 */
export async function getSession() {
  return await auth();
}

/**
 * Get authenticated patient ID
 */
export async function getAuthenticatedClinicianId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id || null;
}

/**
 * Require authenticated clinician session (throws if not authenticated)
 */
export async function requireClinicianAuth() {
  const session = await auth();

  if (!session?.user) {
    throw new Error('Unauthorized: Clinician authentication required');
  }

  return {
    userId: session.user.id,
    email: session.user.email!,
    role: session.user.role,
  };
}
