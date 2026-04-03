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
 *
 * IMPORTANT: NextAuth handlers MUST be exported directly — wrapping them in
 * createPublicRoute strips cookies, CSRF tokens, and redirect headers.
 */

export { GET, POST } from '@/lib/auth/auth';
