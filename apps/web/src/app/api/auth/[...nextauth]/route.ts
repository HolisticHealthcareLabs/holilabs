/**
 * NextAuth v5 API Route
 *
 * Handles all NextAuth requests:
 * - /api/auth/signin
 * - /api/auth/signout
 * - /api/auth/callback/:provider
 * - /api/auth/session
 * - /api/auth/csrf
 * - etc.
 */

export { GET, POST } from '@/lib/auth/auth';
