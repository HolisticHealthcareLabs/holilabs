/**
 * API Middleware Test Suite
 * Tests security controls: RBAC, IDOR protection, CSRF, rate limiting
 *
 * Coverage Target: 90%+ (critical security controls)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import {
  createProtectedRoute,
  verifyPatientAccess,
  rateLimit,
  ApiContext,
} from '../middleware';
import { prisma } from '@/lib/prisma';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    dataAccessGrant: {
      findFirst: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

// Mock Redis
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => ({
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(true),
  })),
}));

// Helper to create mock NextRequest
const mockRequest = (options: {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
} = {}): NextRequest => {
  const headers = new Headers(options.headers || {});

  if (options.cookies) {
    const cookieString = Object.entries(options.cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
    headers.set('cookie', cookieString);
  }

  return {
    url: options.url || 'https://holilabs.xyz/api/test',
    method: options.method || 'GET',
    headers,
    cookies: {
      get: (name: string) => options.cookies?.[name] ? { value: options.cookies[name] } : undefined,
    },
  } as unknown as NextRequest;
};

// Helper to create mock ApiContext
const mockContext = (overrides: Partial<ApiContext> = {}): ApiContext => ({
  requestId: 'req-test-123',
  user: {
    id: 'user-123',
    email: 'clinician@holilabs.xyz',
    role: 'CLINICIAN',
  },
  params: {},
  ...overrides,
});

describe('API Middleware Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createProtectedRoute - Authentication', () => {
    it('should require authentication for protected routes', async () => {
      const handler = vi.fn();
      const protectedHandler = createProtectedRoute(handler, {
        roles: ['CLINICIAN'],
      });

      // Request without authentication
      const request = mockRequest({});
      const context = mockContext({ user: undefined });

      const response = await protectedHandler(request, context);

      expect(response.status).toBe(401);
      expect(handler).not.toHaveBeenCalled();

      const body = await response.json();
      expect(body.error).toBe('Authentication required');
    });

    it('should allow authenticated users', async () => {
      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const protectedHandler = createProtectedRoute(handler, {
        roles: ['CLINICIAN'],
      });

      const request = mockRequest({});
      const context = mockContext(); // Has user by default

      await protectedHandler(request, context);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('createProtectedRoute - RBAC (Role-Based Access Control)', () => {
    it('should enforce role restrictions', async () => {
      const handler = vi.fn();
      const protectedHandler = createProtectedRoute(handler, {
        roles: ['ADMIN'], // Only admins allowed
      });

      const request = mockRequest({});
      const context = mockContext({
        user: { id: 'user-123', email: 'clinician@example.com', role: 'CLINICIAN' },
      });

      const response = await protectedHandler(request, context);

      expect(response.status).toBe(403);
      expect(handler).not.toHaveBeenCalled();

      const body = await response.json();
      expect(body.error).toContain('Insufficient permissions');
    });

    it('should allow users with correct role', async () => {
      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const protectedHandler = createProtectedRoute(handler, {
        roles: ['CLINICIAN', 'NURSE'],
      });

      const request = mockRequest({});
      const context = mockContext({
        user: { id: 'user-123', email: 'nurse@example.com', role: 'NURSE' },
      });

      await protectedHandler(request, context);

      expect(handler).toHaveBeenCalled();
    });

    it('should allow ADMIN to access all endpoints', async () => {
      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const protectedHandler = createProtectedRoute(handler, {
        roles: ['CLINICIAN'], // Clinician required
      });

      const request = mockRequest({});
      const context = mockContext({
        user: { id: 'admin-123', email: 'admin@example.com', role: 'ADMIN' },
      });

      await protectedHandler(request, context);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('verifyPatientAccess - IDOR Protection', () => {
    it('should verify clinician has access to patient', async () => {
      const mockFindFirst = vi.mocked(prisma.dataAccessGrant.findFirst);
      mockFindFirst.mockResolvedValue({
        id: 'grant-123',
        userId: 'clinician-123',
        patientId: 'patient-123',
        accessLevel: 'FULL_ACCESS',
        grantedAt: new Date(),
        grantedBy: 'admin-123',
        expiresAt: null,
        isActive: true,
      } as any);

      const hasAccess = await verifyPatientAccess('clinician-123', 'patient-123');

      expect(hasAccess).toBe(true);
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          userId: 'clinician-123',
          patientId: 'patient-123',
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gte: expect.any(Date) } },
          ],
        },
      });
    });

    it('should deny access if no grant exists', async () => {
      const mockFindFirst = vi.mocked(prisma.dataAccessGrant.findFirst);
      mockFindFirst.mockResolvedValue(null);

      const hasAccess = await verifyPatientAccess('clinician-123', 'patient-456');

      expect(hasAccess).toBe(false);
    });

    it('should deny access if grant is expired', async () => {
      const mockFindFirst = vi.mocked(prisma.dataAccessGrant.findFirst);
      mockFindFirst.mockResolvedValue({
        id: 'grant-123',
        userId: 'clinician-123',
        patientId: 'patient-123',
        accessLevel: 'FULL_ACCESS',
        grantedAt: new Date('2025-01-01'),
        grantedBy: 'admin-123',
        expiresAt: new Date('2025-12-31'), // Expired
        isActive: true,
      } as any);

      const hasAccess = await verifyPatientAccess('clinician-123', 'patient-123');

      // Should return false if current date > expiresAt
      // (Note: Implementation may vary - adjust based on actual middleware)
      expect(hasAccess).toBe(false);
    });

    it('should deny access if grant is inactive', async () => {
      const mockFindFirst = vi.mocked(prisma.dataAccessGrant.findFirst);
      mockFindFirst.mockResolvedValue({
        id: 'grant-123',
        userId: 'clinician-123',
        patientId: 'patient-123',
        accessLevel: 'FULL_ACCESS',
        grantedAt: new Date(),
        grantedBy: 'admin-123',
        expiresAt: null,
        isActive: false,
      } as any);

      const hasAccess = await verifyPatientAccess('clinician-123', 'patient-123');

      expect(hasAccess).toBe(false);
    });

    it('should prevent horizontal privilege escalation', async () => {
      // Clinician A tries to access Clinician B's patient
      const mockFindFirst = vi.mocked(prisma.dataAccessGrant.findFirst);
      mockFindFirst.mockResolvedValue(null); // No grant

      const hasAccess = await verifyPatientAccess('clinician-A', 'patient-of-clinician-B');

      expect(hasAccess).toBe(false);
    });
  });

  describe('CSRF Protection', () => {
    it('should require CSRF token for state-changing operations', async () => {
      const handler = vi.fn();
      const protectedHandler = createProtectedRoute(handler, {
        roles: ['CLINICIAN'],
        // CSRF protection enabled by default for POST/PUT/DELETE
      });

      // POST without CSRF token
      const request = mockRequest({
        method: 'POST',
        url: 'https://holilabs.xyz/api/patients',
      });
      const context = mockContext();

      const response = await protectedHandler(request, context);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toContain('CSRF');
    });

    it('should allow requests with valid CSRF token', async () => {
      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const protectedHandler = createProtectedRoute(handler, {
        roles: ['CLINICIAN'],
      });

      const request = mockRequest({
        method: 'POST',
        headers: {
          'x-csrf-token': 'valid-token-123',
        },
        cookies: {
          'csrf-token': 'valid-token-123', // Matching cookie
        },
      });
      const context = mockContext();

      await protectedHandler(request, context);

      expect(handler).toHaveBeenCalled();
    });

    it('should allow GET requests without CSRF token', async () => {
      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const protectedHandler = createProtectedRoute(handler, {
        roles: ['CLINICIAN'],
      });

      const request = mockRequest({
        method: 'GET',
      });
      const context = mockContext();

      await protectedHandler(request, context);

      expect(handler).toHaveBeenCalled();
    });

    it('should allow skipping CSRF for specific endpoints', async () => {
      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const protectedHandler = createProtectedRoute(handler, {
        roles: ['CLINICIAN'],
        skipCsrf: true, // Explicitly skip CSRF (e.g., for OAuth callbacks)
      });

      const request = mockRequest({
        method: 'POST',
      });
      const context = mockContext();

      await protectedHandler(request, context);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const config = {
        windowMs: 60000, // 1 minute
        maxRequests: 2, // Only 2 requests per minute
      };

      const middleware = rateLimit(config);
      const request = mockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });
      const context = mockContext();

      const next = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));

      // First request - should pass
      const response1 = await middleware(request, context, next);
      expect(response1.status).toBe(200);

      // Second request - should pass
      const response2 = await middleware(request, context, next);
      expect(response2.status).toBe(200);

      // Third request - should be rate limited
      const response3 = await middleware(request, context, next);
      expect(response3.status).toBe(429);

      const body = await response3.json();
      expect(body.error).toContain('Too many requests');
    });

    it('should track rate limits per IP address', async () => {
      const config = {
        windowMs: 60000,
        maxRequests: 1,
      };

      const middleware = rateLimit(config);
      const next = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));

      // Request from IP 1
      const request1 = mockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });
      const context1 = mockContext();

      const response1 = await middleware(request1, context1, next);
      expect(response1.status).toBe(200);

      // Request from IP 2 - should still work
      const request2 = mockRequest({
        headers: { 'x-forwarded-for': '192.168.1.2' },
      });
      const context2 = mockContext();

      const response2 = await middleware(request2, context2, next);
      expect(response2.status).toBe(200);
    });

    it('should include Retry-After header when rate limited', async () => {
      const config = {
        windowMs: 60000, // 1 minute
        maxRequests: 1,
      };

      const middleware = rateLimit(config);
      const request = mockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });
      const context = mockContext();
      const next = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));

      // First request - pass
      await middleware(request, context, next);

      // Second request - rate limited
      const response = await middleware(request, context, next);

      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBeTruthy();
    });

    it('should reset rate limit after window expires', async () => {
      // Note: This test requires time mocking or actual waiting
      // Simplified version - full test would use vi.useFakeTimers()

      const config = {
        windowMs: 100, // 100ms window for testing
        maxRequests: 1,
      };

      const middleware = rateLimit(config);
      const request = mockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });
      const context = mockContext();
      const next = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));

      // First request
      const response1 = await middleware(request, context, next);
      expect(response1.status).toBe(200);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be allowed again
      const response2 = await middleware(request, context, next);
      expect(response2.status).toBe(200);
    });
  });

  describe('Audit Logging Integration', () => {
    it('should create audit log for all requests', async () => {
      const mockCreate = vi.mocked(prisma.auditLog.create);
      mockCreate.mockResolvedValue({} as any);

      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const protectedHandler = createProtectedRoute(handler, {
        roles: ['CLINICIAN'],
        audit: { action: 'READ', resource: 'Patient' },
      });

      const request = mockRequest({});
      const context = mockContext();

      await protectedHandler(request, context);

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          action: 'READ',
          resource: 'Patient',
        }),
      });
    });

    it('should audit access denied attempts', async () => {
      const mockCreate = vi.mocked(prisma.auditLog.create);
      mockCreate.mockResolvedValue({} as any);

      const handler = vi.fn();
      const protectedHandler = createProtectedRoute(handler, {
        roles: ['ADMIN'], // Only admins
        audit: { action: 'DELETE', resource: 'User' },
      });

      const request = mockRequest({});
      const context = mockContext({
        user: { id: 'user-123', email: 'clinician@example.com', role: 'CLINICIAN' },
      });

      await protectedHandler(request, context);

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'ACCESS_DENIED',
          success: false,
        }),
      });
    });
  });

  describe('Security Headers', () => {
    it('should add security headers to all responses', async () => {
      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const protectedHandler = createProtectedRoute(handler, {
        roles: ['CLINICIAN'],
      });

      const request = mockRequest({});
      const context = mockContext();

      const response = await protectedHandler(request, context);

      // Check for security headers
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
    });

    it('should include CORS headers', async () => {
      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const protectedHandler = createProtectedRoute(handler, {
        roles: ['CLINICIAN'],
      });

      const request = mockRequest({
        headers: { 'Origin': 'https://holilabs.xyz' },
      });
      const context = mockContext();

      const response = await protectedHandler(request, context);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
    });
  });

  describe('Request ID Tracking', () => {
    it('should add request ID to context', async () => {
      const handler = vi.fn().mockImplementation(async (req, ctx) => {
        expect(ctx.requestId).toBeTruthy();
        expect(typeof ctx.requestId).toBe('string');
        return NextResponse.json({ success: true });
      });

      const protectedHandler = createProtectedRoute(handler, {
        roles: ['CLINICIAN'],
      });

      const request = mockRequest({});
      const context = mockContext();

      await protectedHandler(request, context);

      expect(handler).toHaveBeenCalled();
    });

    it('should include request ID in response headers', async () => {
      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const protectedHandler = createProtectedRoute(handler, {
        roles: ['CLINICIAN'],
      });

      const request = mockRequest({});
      const context = mockContext();

      const response = await protectedHandler(request, context);

      expect(response.headers.get('X-Request-Id')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle handler errors gracefully', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Handler error'));

      const protectedHandler = createProtectedRoute(handler, {
        roles: ['CLINICIAN'],
      });

      const request = mockRequest({});
      const context = mockContext();

      const response = await protectedHandler(request, context);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBeTruthy();
    });

    it('should not expose internal error details in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const handler = vi.fn().mockRejectedValue(new Error('Internal database connection failed'));

      const protectedHandler = createProtectedRoute(handler, {
        roles: ['CLINICIAN'],
      });

      const request = mockRequest({});
      const context = mockContext();

      const response = await protectedHandler(request, context);

      const body = await response.json();
      expect(body.error).not.toContain('database'); // Internal details hidden

      process.env.NODE_ENV = originalEnv;
    });

    it('should expose error details in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const handler = vi.fn().mockRejectedValue(new Error('Detailed error message'));

      const protectedHandler = createProtectedRoute(handler, {
        roles: ['CLINICIAN'],
      });

      const request = mockRequest({});
      const context = mockContext();

      const response = await protectedHandler(request, context);

      const body = await response.json();
      expect(body.error || body.message).toContain('Detailed error'); // Details shown in dev

      process.env.NODE_ENV = originalEnv;
    });
  });
});
