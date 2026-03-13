/**
 * Patient Portal Route Middleware
 *
 * Provides the same security guarantees as `createProtectedRoute` but for
 * patient-facing portal routes that authenticate via patient JWT session
 * (cookie-based) rather than NextAuth.
 *
 * Security features:
 * - Patient JWT session verification (via requirePatientSession)
 * - CSRF protection (SameSite + origin check)
 * - Rate limiting (default: 30 req/min)
 * - Audit logging for every patient data access
 * - Security headers
 * - CORS handling
 * - Request ID tracking
 * - Consistent error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePatientSession, type PatientSession } from '@/lib/auth/patient-session';
import { csrfProtection } from '@/lib/security/csrf';
import { handlePreflight, applyCorsHeaders } from './cors';
import { getOrCreateRequestId, REQUEST_ID_HEADER } from '@/lib/request-id';
import { applySecurityHeaders } from './security-headers';
import { auditBuffer } from './audit-buffer';
import logger from '@/lib/logger';

export interface PatientPortalContext {
  session: PatientSession;
  requestId: string;
  params: Record<string, string>;
}

type PatientPortalHandler = (
  request: NextRequest,
  context: PatientPortalContext
) => Promise<NextResponse>;

interface PatientPortalRouteOptions {
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  audit?: {
    action: string;
    resource: string;
  };
  skipCsrf?: boolean;
}

const portalRateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkPortalRateLimit(
  key: string,
  windowMs: number,
  maxRequests: number
): boolean {
  const now = Date.now();
  const entry = portalRateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    portalRateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}

export function createPatientPortalRoute(
  handler: PatientPortalHandler,
  options?: PatientPortalRouteOptions
) {
  return async (request: NextRequest, routeContext?: any) => {
    const requestId = getOrCreateRequestId(request.headers);

    const preflightResponse = handlePreflight(request);
    if (preflightResponse) {
      preflightResponse.headers.set(REQUEST_ID_HEADER, requestId);
      return preflightResponse;
    }

    try {
      // 1. Rate limiting (default 30 req/min)
      const rlConfig = options?.rateLimit ?? { windowMs: 60_000, maxRequests: 30 };
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
      const rlKey = `portal:${ip}:${request.nextUrl.pathname}`;

      if (!checkPortalRateLimit(rlKey, rlConfig.windowMs, rlConfig.maxRequests)) {
        return applyHeaders(
          requestId,
          request,
          NextResponse.json({ error: 'Too many requests' }, { status: 429 })
        );
      }

      // 2. CSRF protection for mutating requests
      if (!options?.skipCsrf && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
        const origin = request.headers.get('origin');
        const host = request.headers.get('host');
        if (origin && host) {
          try {
            const originHost = new URL(origin).host;
            if (originHost !== host) {
              logger.warn({ event: 'portal_csrf_blocked', origin, host, path: request.nextUrl.pathname });
              return applyHeaders(
                requestId,
                request,
                NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
              );
            }
          } catch {
            // Malformed origin header
          }
        }
      }

      // 3. Patient session authentication
      let session: PatientSession;
      try {
        session = await requirePatientSession();
      } catch {
        return applyHeaders(
          requestId,
          request,
          NextResponse.json({ error: 'Unauthorized: Patient session required' }, { status: 401 })
        );
      }

      // 4. Execute handler
      const resolvedParams = routeContext?.params ? await Promise.resolve(routeContext.params) : {};
      const context: PatientPortalContext = { session, requestId, params: resolvedParams };
      const start = Date.now();
      const response = await handler(request, context);
      const duration = Date.now() - start;

      // 5. Audit logging
      const auditConfig = options?.audit;
      if (auditConfig) {
        auditBuffer.enqueue({
          userId: session.userId,
          userEmail: session.email,
          ipAddress: ip,
          action: auditConfig.action as any,
          resource: auditConfig.resource,
          resourceId: session.patientId,
          success: response.status < 400,
          details: {
            method: request.method,
            url: request.nextUrl.pathname,
            duration,
            statusCode: response.status,
            sessionType: 'patient',
          },
        });
      }

      return applyHeaders(requestId, request, response);
    } catch (error) {
      logger.error({
        event: 'portal_route_error',
        path: request.nextUrl.pathname,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return applyHeaders(
        requestId,
        request,
        NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        )
      );
    }
  };
}

function applyHeaders(
  requestId: string,
  request: NextRequest,
  response: NextResponse
): NextResponse {
  response.headers.set(REQUEST_ID_HEADER, requestId);
  response = applyCorsHeaders(request, response);
  response = applySecurityHeaders(response);
  return response;
}
