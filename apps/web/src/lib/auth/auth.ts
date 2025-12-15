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
export async function getAuthenticatedPatientId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.patientId || null;
}

/**
 * Require authenticated patient session (throws if not authenticated)
 */
export async function requirePatientAuth() {
  const session = await auth();

  if (!session?.user || session.user.role !== 'patient') {
    throw new Error('Unauthorized: Patient authentication required');
  }

  return {
    userId: session.user.id,
    patientId: session.user.patientId,
    email: session.user.email!,
  };
}
