/**
 * Bemi Audit Context - SOC 2 Control CC7.2 (System Monitoring)
 *
 * This module provides automatic audit trail capture at the PostgreSQL WAL level.
 * Unlike application-level audit logging (audit.ts), Bemi captures:
 * - Complete before/after state of every database change
 * - Tamper-proof audit trail (cannot be deleted from application)
 * - Automatic change tracking without manual instrumentation
 *
 * Integration Pattern:
 * - Application logs (audit.ts): User actions, access reasons, LGPD compliance
 * - Bemi logs: Complete database change history, SOC 2 evidence
 *
 * Architecture:
 * - PostgreSQL WAL replication captures all INSERT/UPDATE/DELETE
 * - Context (userId, endpoint, IP) binds to async execution
 * - Audit data stored separately from application tables
 *
 * Requirements:
 * - PostgreSQL 14+ with wal_level=logical
 * - ALTER TABLE ... REPLICA IDENTITY FULL (for before/after state)
 * - ENABLE_BEMI_AUDIT=true environment variable
 *
 * Example Usage:
 * ```typescript
 * import { setBemiContext } from '@/lib/audit/bemi-context';
 *
 * export async function POST(request: Request) {
 *   const user = await getServerSession();
 *   setBemiContext({
 *     userId: user.id,
 *     userEmail: user.email,
 *     endpoint: '/api/patients',
 *     ipAddress: request.headers.get('x-forwarded-for'),
 *   });
 *
 *   // All Prisma operations now automatically capture context
 *   await prisma.patient.create({ data });
 * }
 * ```
 */

import { setBemiContext as _setBemiContext } from '@bemi-db/prisma';
import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import type { Session } from '@/lib/auth';

/**
 * Bemi context interface
 * This metadata is attached to every database change
 */
export interface BemiContext {
  userId?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  endpoint?: string;
  method?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  accessReason?: string;
  requestId?: string;
}

/**
 * Extract IP address from Next.js request
 */
function extractIpAddress(request?: NextRequest | Request): string {
  if (!request) return 'unknown';

  const headers = request.headers;

  // Try x-forwarded-for (CloudFront, ALB, proxies)
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  // Try x-real-ip (Nginx)
  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  // Try CF-Connecting-IP (Cloudflare)
  const cfIp = headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp.trim();
  }

  return 'unknown';
}

/**
 * Extract user agent from request
 */
function extractUserAgent(request?: NextRequest | Request): string {
  if (!request) return 'unknown';
  return request.headers.get('user-agent') || 'unknown';
}

/**
 * Extract request metadata from Next.js request
 */
function extractRequestMetadata(request?: NextRequest | Request): {
  endpoint?: string;
  method?: string;
  ipAddress: string;
  userAgent: string;
} {
  if (!request) {
    return {
      ipAddress: 'unknown',
      userAgent: 'unknown',
    };
  }

  let endpoint: string | undefined;
  let method: string | undefined;

  // Handle Next.js Request vs NextRequest
  if ('nextUrl' in request) {
    // NextRequest (middleware)
    endpoint = request.nextUrl.pathname;
    method = request.method;
  } else if ('url' in request) {
    // Standard Request (API routes)
    try {
      const url = new URL(request.url);
      endpoint = url.pathname;
    } catch {
      endpoint = 'unknown';
    }
    method = request.method;
  }

  return {
    endpoint,
    method,
    ipAddress: extractIpAddress(request),
    userAgent: extractUserAgent(request),
  };
}

/**
 * Set Bemi context for current async execution
 *
 * This binds audit metadata to all database operations in the current
 * request/execution context. Bemi uses AsyncLocalStorage internally.
 *
 * @param context - Audit context to attach to database changes
 *
 * @example
 * ```typescript
 * setBemiContext({
 *   userId: 'user_123',
 *   userEmail: 'doctor@holilabs.xyz',
 *   userRole: 'PHYSICIAN',
 *   endpoint: '/api/patients',
 *   ipAddress: '192.168.1.1',
 * });
 * ```
 */
export function setBemiContext(context: BemiContext): void {
  if (process.env.ENABLE_BEMI_AUDIT !== 'true') {
    // Bemi is disabled, skip context setting
    logger.debug({ event: 'bemi_disabled', context }, 'Bemi audit logging is disabled');
    return;
  }

  try {
    // Bemi expects flat key-value pairs (strings)
    const flatContext: Record<string, string> = {};

    if (context.userId) flatContext.userId = context.userId;
    if (context.userEmail) flatContext.userEmail = context.userEmail;
    if (context.userRole) flatContext.userRole = context.userRole;
    if (context.endpoint) flatContext.endpoint = context.endpoint;
    if (context.method) flatContext.method = context.method;
    if (context.ipAddress) flatContext.ipAddress = context.ipAddress;
    if (context.userAgent) flatContext.userAgent = context.userAgent;
    if (context.sessionId) flatContext.sessionId = context.sessionId;
    if (context.accessReason) flatContext.accessReason = context.accessReason;
    if (context.requestId) flatContext.requestId = context.requestId;

    // Set context in Bemi's AsyncLocalStorage
    _setBemiContext(flatContext);

    logger.debug({
      event: 'bemi_context_set',
      userId: context.userId,
      endpoint: context.endpoint,
    }, 'Bemi audit context set for current request');
  } catch (error) {
    // Never let audit logging break the application
    logger.error({
      event: 'bemi_context_failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      context,
    }, 'Failed to set Bemi audit context');
  }
}

/**
 * Set Bemi context from Next.js request and session
 *
 * Convenience function that automatically extracts context from
 * Next.js request and NextAuth session.
 *
 * @param request - Next.js request object
 * @param session - NextAuth session (if available)
 * @param options - Additional context options
 *
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const session = await getServerSession();
 *   setBemiContextFromRequest(request, session, {
 *     accessReason: 'TREATMENT',
 *   });
 *
 *   await prisma.patient.update({ ... }); // Automatically audited
 * }
 * ```
 */
export function setBemiContextFromRequest(
  request: NextRequest | Request,
  session?: Session | null,
  options?: {
    accessReason?: string;
    requestId?: string;
  }
): void {
  const requestMetadata = extractRequestMetadata(request);

  setBemiContext({
    userId: session?.user?.id || null,
    userEmail: session?.user?.email || null,
    userRole: (session?.user as any)?.role || null,
    sessionId: (session as any)?.sessionId || undefined,
    ...requestMetadata,
    ...options,
  });
}

/**
 * Clear Bemi context for current async execution
 *
 * Usually not needed as context is automatically scoped to request lifecycle.
 * Use this if you need to explicitly clear context mid-request.
 */
export function clearBemiContext(): void {
  if (process.env.ENABLE_BEMI_AUDIT !== 'true') {
    return;
  }

  try {
    _setBemiContext({});
    logger.debug({ event: 'bemi_context_cleared' }, 'Bemi audit context cleared');
  } catch (error) {
    logger.error({
      event: 'bemi_context_clear_failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to clear Bemi audit context');
  }
}

/**
 * Bemi context middleware for Next.js App Router
 *
 * Automatically sets Bemi context for all API routes and server actions.
 *
 * @example middleware.ts
 * ```typescript
 * import { withBemiContext } from '@/lib/audit/bemi-context';
 *
 * export default withBemiContext(async (request: NextRequest) => {
 *   // Your middleware logic
 *   return NextResponse.next();
 * });
 * ```
 */
export function withBemiContext(
  handler: (request: NextRequest) => Promise<Response> | Response
) {
  return async (request: NextRequest): Promise<Response> => {
    // Set context before executing handler
    // Session will be resolved in the handler if needed
    setBemiContextFromRequest(request, null, {
      requestId: crypto.randomUUID(),
    });

    return handler(request);
  };
}

/**
 * HOC for API route handlers with automatic Bemi context
 *
 * @example app/api/patients/route.ts
 * ```typescript
 * import { withBemiAudit } from '@/lib/audit/bemi-context';
 *
 * export const POST = withBemiAudit(async (request) => {
 *   // Bemi context automatically set with session
 *   await prisma.patient.create({ data });
 *   return Response.json({ success: true });
 * });
 * ```
 */
export function withBemiAudit(
  handler: (
    request: NextRequest | Request,
    context?: { params?: any }
  ) => Promise<Response> | Response
) {
  return async (
    request: NextRequest | Request,
    context?: { params?: any }
  ): Promise<Response> => {
    // Import dynamically to avoid circular dependencies
    const { getServerSession } = await import('@/lib/auth');

    const session = await getServerSession();

    setBemiContextFromRequest(request, session, {
      requestId: crypto.randomUUID(),
    });

    return handler(request, context);
  };
}

/**
 * Health check for Bemi integration
 *
 * @returns Status of Bemi audit system
 */
export async function checkBemiHealth(): Promise<{
  enabled: boolean;
  configured: boolean;
  message: string;
}> {
  const enabled = process.env.ENABLE_BEMI_AUDIT === 'true';

  if (!enabled) {
    return {
      enabled: false,
      configured: false,
      message: 'Bemi audit logging is disabled (ENABLE_BEMI_AUDIT != true)',
    };
  }

  // Check if DATABASE_URL is configured
  if (!process.env.DATABASE_URL) {
    return {
      enabled: true,
      configured: false,
      message: 'DATABASE_URL not configured',
    };
  }

  // Check if PostgreSQL WAL replication is enabled
  // This requires a database query, so we'll defer to runtime checks
  try {
    const { prisma } = await import('@/lib/prisma');
    const result = await prisma.$queryRaw<Array<{ wal_level: string }>>`
      SHOW wal_level;
    `;

    const walLevel = result[0]?.wal_level;

    if (walLevel !== 'logical') {
      return {
        enabled: true,
        configured: false,
        message: `PostgreSQL wal_level is "${walLevel}", must be "logical" for Bemi audit trail`,
      };
    }

    return {
      enabled: true,
      configured: true,
      message: 'Bemi audit logging is operational',
    };
  } catch (error) {
    return {
      enabled: true,
      configured: false,
      message: `Failed to check PostgreSQL configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Example of setting up Bemi for a specific table
 *
 * Run this SQL to enable full before/after state tracking:
 *
 * ```sql
 * -- Enable logical replication (requires PostgreSQL restart)
 * ALTER SYSTEM SET wal_level = logical;
 *
 * -- Enable REPLICA IDENTITY FULL for tables with PHI
 * ALTER TABLE "Patient" REPLICA IDENTITY FULL;
 * ALTER TABLE "Consultation" REPLICA IDENTITY FULL;
 * ALTER TABLE "Prescription" REPLICA IDENTITY FULL;
 * ALTER TABLE "LabResult" REPLICA IDENTITY FULL;
 * ALTER TABLE "Invoice" REPLICA IDENTITY FULL;
 *
 * -- Verify configuration
 * SHOW wal_level; -- Should return 'logical'
 * SELECT schemaname, tablename, relreplident
 * FROM pg_catalog.pg_tables t
 * JOIN pg_catalog.pg_class c ON c.relname = t.tablename
 * WHERE schemaname = 'public'
 *   AND relreplident = 'f'; -- 'f' means FULL
 * ```
 */
export const BEMI_SETUP_INSTRUCTIONS = `
# Bemi Audit Trail Setup for PostgreSQL

## Prerequisites
- PostgreSQL 14+ (Bemi requires logical replication)
- Superuser access to database (for ALTER SYSTEM)
- Database restart permission

## Step 1: Enable Logical Replication

Connect to your database as superuser:

\`\`\`bash
psql $DATABASE_URL
\`\`\`

Enable WAL level:

\`\`\`sql
ALTER SYSTEM SET wal_level = logical;
\`\`\`

**IMPORTANT**: Restart PostgreSQL server after this change.

Verify configuration:

\`\`\`sql
SHOW wal_level;
-- Expected output: logical
\`\`\`

## Step 2: Configure Tables for Full Audit Trail

Enable REPLICA IDENTITY FULL for all tables containing PHI:

\`\`\`sql
ALTER TABLE "Patient" REPLICA IDENTITY FULL;
ALTER TABLE "Consultation" REPLICA IDENTITY FULL;
ALTER TABLE "Prescription" REPLICA IDENTITY FULL;
ALTER TABLE "LabResult" REPLICA IDENTITY FULL;
ALTER TABLE "Invoice" REPLICA IDENTITY FULL;
ALTER TABLE "User" REPLICA IDENTITY FULL;
ALTER TABLE "AuditLog" REPLICA IDENTITY FULL;
\`\`\`

Verify:

\`\`\`sql
SELECT schemaname, tablename, relreplident
FROM pg_catalog.pg_tables t
JOIN pg_catalog.pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public'
  AND relreplident = 'f'; -- 'f' means FULL
\`\`\`

## Step 3: Enable Bemi in Environment

Add to your \`.env\`:

\`\`\`
ENABLE_BEMI_AUDIT=true
\`\`\`

## Step 4: Health Check

Run health check in your application:

\`\`\`typescript
import { checkBemiHealth } from '@/lib/audit/bemi-context';

const health = await checkBemiHealth();
console.log(health);
\`\`\`

## Step 5: Verify Audit Trail

Make a database change and verify it's captured:

\`\`\`typescript
import { setBemiContext } from '@/lib/audit/bemi-context';

setBemiContext({
  userId: 'test_user',
  endpoint: '/api/test',
});

await prisma.patient.create({ data: { ... } });
\`\`\`

Check Bemi's audit trail (configure Bemi Cloud or self-hosted Bemi Worker).

## SOC 2 Compliance Notes

- **CC7.2 (System Monitoring)**: Bemi captures all database changes
- **6-Year Retention**: Configure Bemi retention policy (separate from app DB)
- **Tamper-Proof**: Audit trail stored outside application database
- **Complete History**: Before/after state for every change
`;
