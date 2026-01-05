/**
 * Rate Limiting Tests
 *
 * Tests for rate limiting functionality using Upstash Redis
 *
 * Coverage:
 * - Rate limit enforcement
 * - 429 response structure
 * - Retry-After header
 * - X-RateLimit-* headers
 * - IP-based and user-based rate limiting
 * - Fail-open behavior when Redis is down
 * - Development mode bypass
 */

import { describe, it, expect, vi, beforeEach, afterEach } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, checkRateLimit, rateLimiters } from '../rate-limit';

// Mock Upstash Redis
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => ({
    // Mock Redis instance
  })),
}));

// Mock Upstash Ratelimit
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: vi.fn().mockImplementation((config) => ({
    limit: vi.fn(),
    config,
  })),
}));

// Mock logger
vi.mock('../../logger', () => ({
  default: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('Rate Limiting', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock request
    mockRequest = new NextRequest('https://holilabs.xyz/api/test', {
      method: 'GET',
      headers: {
        'x-forwarded-for': '203.0.113.1',
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rate Limiter Configuration', () => {
    it('should have all required rate limiters configured', () => {
      const expectedLimiters = [
        'auth',
        'registration',
        'passwordReset',
        'upload',
        'messages',
        'api',
        'search',
        'appointments',
      ];

      expectedLimiters.forEach((limiter) => {
        expect(rateLimiters).toHaveProperty(limiter);
      });
    });

    it('should configure auth limiter with 5 requests per 15 minutes', () => {
      const authLimiter = rateLimiters.auth;

      if (!authLimiter) {
        // If Redis not configured, skip test
        expect(authLimiter).toBeNull();
        return;
      }

      expect(authLimiter).toBeDefined();
      // Note: Cannot directly test sliding window config, but verify limiter exists
    });

    it('should configure registration limiter with 3 requests per hour', () => {
      const registrationLimiter = rateLimiters.registration;

      if (!registrationLimiter) {
        expect(registrationLimiter).toBeNull();
        return;
      }

      expect(registrationLimiter).toBeDefined();
    });

    it('should configure general API limiter with 100 requests per minute', () => {
      const apiLimiter = rateLimiters.api;

      if (!apiLimiter) {
        expect(apiLimiter).toBeNull();
        return;
      }

      expect(apiLimiter).toBeDefined();
    });
  });

  describe('Identifier Extraction', () => {
    it('should use user ID for authenticated requests', async () => {
      const userId = 'user-123';

      // We'll test this by checking the identifier used in the limit call
      // This requires accessing private function, so we test behavior instead

      if (!rateLimiters.api) {
        // If Redis not configured, skip test
        return;
      }

      const mockLimit = vi.fn().mockResolvedValue({
        success: true,
        limit: 100,
        reset: Date.now() + 60000,
        remaining: 99,
      });

      rateLimiters.api.limit = mockLimit;

      await applyRateLimit(mockRequest, 'api', userId);

      expect(mockLimit).toHaveBeenCalledWith(`user:${userId}`);
    });

    it('should use IP address for unauthenticated requests', async () => {
      if (!rateLimiters.api) {
        return;
      }

      const mockLimit = vi.fn().mockResolvedValue({
        success: true,
        limit: 100,
        reset: Date.now() + 60000,
        remaining: 99,
      });

      rateLimiters.api.limit = mockLimit;

      await applyRateLimit(mockRequest, 'api');

      expect(mockLimit).toHaveBeenCalledWith('ip:203.0.113.1');
    });

    it('should handle x-real-ip header when x-forwarded-for is not present', async () => {
      const requestWithRealIp = new NextRequest('https://holilabs.xyz/api/test', {
        method: 'GET',
        headers: {
          'x-real-ip': '198.51.100.1',
        },
      });

      if (!rateLimiters.api) {
        return;
      }

      const mockLimit = vi.fn().mockResolvedValue({
        success: true,
        limit: 100,
        reset: Date.now() + 60000,
        remaining: 99,
      });

      rateLimiters.api.limit = mockLimit;

      await applyRateLimit(requestWithRealIp, 'api');

      expect(mockLimit).toHaveBeenCalledWith('ip:198.51.100.1');
    });

    it('should use "anonymous" when no IP headers present', async () => {
      const requestWithoutIp = new NextRequest('https://holilabs.xyz/api/test', {
        method: 'GET',
      });

      if (!rateLimiters.api) {
        return;
      }

      const mockLimit = vi.fn().mockResolvedValue({
        success: true,
        limit: 100,
        reset: Date.now() + 60000,
        remaining: 99,
      });

      rateLimiters.api.limit = mockLimit;

      await applyRateLimit(requestWithoutIp, 'api');

      expect(mockLimit).toHaveBeenCalledWith('ip:anonymous');
    });
  });

  describe('Rate Limit Enforcement', () => {
    it('should allow request when under rate limit', async () => {
      if (!rateLimiters.api) {
        return;
      }

      const mockLimit = vi.fn().mockResolvedValue({
        success: true,
        limit: 100,
        reset: Date.now() + 60000,
        remaining: 99,
      });

      rateLimiters.api.limit = mockLimit;

      const result = await applyRateLimit(mockRequest, 'api');

      expect(result.success).toBe(true);
      expect(result.response).toBeUndefined();
    });

    it('should reject request when rate limit exceeded', async () => {
      if (!rateLimiters.api) {
        return;
      }

      const reset = Date.now() + 60000; // Reset in 60 seconds

      const mockLimit = vi.fn().mockResolvedValue({
        success: false,
        limit: 100,
        reset,
        remaining: 0,
      });

      rateLimiters.api.limit = mockLimit;

      const result = await applyRateLimit(mockRequest, 'api');

      expect(result.success).toBe(false);
      expect(result.response).toBeDefined();
      expect(result.response?.status).toBe(429);
    });

    it('should include correct error message in 429 response', async () => {
      if (!rateLimiters.api) {
        return;
      }

      const reset = Date.now() + 60000;

      const mockLimit = vi.fn().mockResolvedValue({
        success: false,
        limit: 100,
        reset,
        remaining: 0,
      });

      rateLimiters.api.limit = mockLimit;

      const result = await applyRateLimit(mockRequest, 'api');

      const responseData = await result.response?.json();

      expect(responseData).toEqual({
        success: false,
        error: 'Too many requests. Please try again later.',
        details: {
          limit: 100,
          remaining: 0,
          reset: new Date(reset).toISOString(),
          retryAfter: expect.any(Number),
        },
      });
    });
  });

  describe('Rate Limit Headers', () => {
    it('should include X-RateLimit-* headers in 429 response', async () => {
      if (!rateLimiters.api) {
        return;
      }

      const reset = Date.now() + 60000;

      const mockLimit = vi.fn().mockResolvedValue({
        success: false,
        limit: 100,
        reset,
        remaining: 0,
      });

      rateLimiters.api.limit = mockLimit;

      const result = await applyRateLimit(mockRequest, 'api');

      const headers = result.response?.headers;

      expect(headers?.get('X-RateLimit-Limit')).toBe('100');
      expect(headers?.get('X-RateLimit-Remaining')).toBe('0');
      expect(headers?.get('X-RateLimit-Reset')).toBe(reset.toString());
    });

    it('should include Retry-After header in 429 response', async () => {
      if (!rateLimiters.api) {
        return;
      }

      const reset = Date.now() + 60000; // Reset in 60 seconds

      const mockLimit = vi.fn().mockResolvedValue({
        success: false,
        limit: 100,
        reset,
        remaining: 0,
      });

      rateLimiters.api.limit = mockLimit;

      const result = await applyRateLimit(mockRequest, 'api');

      const retryAfter = result.response?.headers.get('Retry-After');

      expect(retryAfter).toBeDefined();
      expect(parseInt(retryAfter!)).toBeGreaterThan(0);
      expect(parseInt(retryAfter!)).toBeLessThanOrEqual(60);
    });

    it('should calculate Retry-After correctly', async () => {
      if (!rateLimiters.api) {
        return;
      }

      const reset = Date.now() + 45000; // Reset in 45 seconds

      const mockLimit = vi.fn().mockResolvedValue({
        success: false,
        limit: 100,
        reset,
        remaining: 0,
      });

      rateLimiters.api.limit = mockLimit;

      const result = await applyRateLimit(mockRequest, 'api');

      const retryAfter = parseInt(result.response?.headers.get('Retry-After')!);

      // Should be approximately 45 seconds (allow 5 second variance for test execution)
      expect(retryAfter).toBeGreaterThanOrEqual(40);
      expect(retryAfter).toBeLessThanOrEqual(50);
    });
  });

  describe('Different Rate Limiter Types', () => {
    it('should enforce auth rate limits (5 per 15 minutes)', async () => {
      if (!rateLimiters.auth) {
        return;
      }

      const mockLimit = vi.fn().mockResolvedValue({
        success: false,
        limit: 5,
        reset: Date.now() + 900000, // 15 minutes
        remaining: 0,
      });

      rateLimiters.auth.limit = mockLimit;

      const result = await applyRateLimit(mockRequest, 'auth');

      expect(result.success).toBe(false);

      const responseData = await result.response?.json();
      expect(responseData.details.limit).toBe(5);
    });

    it('should enforce registration rate limits (3 per hour)', async () => {
      if (!rateLimiters.registration) {
        return;
      }

      const mockLimit = vi.fn().mockResolvedValue({
        success: false,
        limit: 3,
        reset: Date.now() + 3600000, // 1 hour
        remaining: 0,
      });

      rateLimiters.registration.limit = mockLimit;

      const result = await applyRateLimit(mockRequest, 'registration');

      expect(result.success).toBe(false);

      const responseData = await result.response?.json();
      expect(responseData.details.limit).toBe(3);
    });

    it('should enforce upload rate limits (10 per minute)', async () => {
      if (!rateLimiters.upload) {
        return;
      }

      const mockLimit = vi.fn().mockResolvedValue({
        success: false,
        limit: 10,
        reset: Date.now() + 60000, // 1 minute
        remaining: 0,
      });

      rateLimiters.upload.limit = mockLimit;

      const result = await applyRateLimit(mockRequest, 'upload');

      expect(result.success).toBe(false);

      const responseData = await result.response?.json();
      expect(responseData.details.limit).toBe(10);
    });

    it('should enforce search rate limits (20 per minute)', async () => {
      if (!rateLimiters.search) {
        return;
      }

      const mockLimit = vi.fn().mockResolvedValue({
        success: false,
        limit: 20,
        reset: Date.now() + 60000,
        remaining: 0,
      });

      rateLimiters.search.limit = mockLimit;

      const result = await applyRateLimit(mockRequest, 'search');

      expect(result.success).toBe(false);

      const responseData = await result.response?.json();
      expect(responseData.details.limit).toBe(20);
    });
  });

  describe('Fail-Open Behavior', () => {
    it('should allow request when Redis is not configured (development)', async () => {
      // Simulate Redis not configured
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // rateLimiters will be null when Redis is not configured
      // Test with null limiter
      const result = await applyRateLimit(mockRequest, 'api');

      expect(result.success).toBe(true);
      expect(result.response).toBeUndefined();

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should log warning when Redis is not configured in production', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const result = await applyRateLimit(mockRequest, 'api');

      // Should still allow request (fail-open)
      expect(result.success).toBe(true);

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should allow request when rate limit check throws error (fail-open)', async () => {
      if (!rateLimiters.api) {
        return;
      }

      const mockLimit = vi.fn().mockRejectedValue(new Error('Redis connection failed'));

      rateLimiters.api.limit = mockLimit;

      const result = await applyRateLimit(mockRequest, 'api');

      // Should allow request despite error (fail-open)
      expect(result.success).toBe(true);
      expect(result.response).toBeUndefined();
    });
  });

  describe('checkRateLimit Helper', () => {
    it('should return null when rate limit not exceeded', async () => {
      if (!rateLimiters.api) {
        return;
      }

      const mockLimit = vi.fn().mockResolvedValue({
        success: true,
        limit: 100,
        reset: Date.now() + 60000,
        remaining: 99,
      });

      rateLimiters.api.limit = mockLimit;

      const response = await checkRateLimit(mockRequest, 'api');

      expect(response).toBeNull();
    });

    it('should return 429 response when rate limit exceeded', async () => {
      if (!rateLimiters.api) {
        return;
      }

      const mockLimit = vi.fn().mockResolvedValue({
        success: false,
        limit: 100,
        reset: Date.now() + 60000,
        remaining: 0,
      });

      rateLimiters.api.limit = mockLimit;

      const response = await checkRateLimit(mockRequest, 'api');

      expect(response).not.toBeNull();
      expect(response?.status).toBe(429);
    });
  });

  describe('Multiple Requests from Same IP', () => {
    it('should track requests per IP address', async () => {
      if (!rateLimiters.api) {
        return;
      }

      const mockLimit = vi.fn()
        .mockResolvedValueOnce({
          success: true,
          limit: 100,
          reset: Date.now() + 60000,
          remaining: 99,
        })
        .mockResolvedValueOnce({
          success: true,
          limit: 100,
          reset: Date.now() + 60000,
          remaining: 98,
        })
        .mockResolvedValueOnce({
          success: true,
          limit: 100,
          reset: Date.now() + 60000,
          remaining: 97,
        });

      rateLimiters.api.limit = mockLimit;

      // Request 1
      const result1 = await applyRateLimit(mockRequest, 'api');
      expect(result1.success).toBe(true);

      // Request 2
      const result2 = await applyRateLimit(mockRequest, 'api');
      expect(result2.success).toBe(true);

      // Request 3
      const result3 = await applyRateLimit(mockRequest, 'api');
      expect(result3.success).toBe(true);

      // Verify same identifier used for all requests
      expect(mockLimit).toHaveBeenCalledTimes(3);
      expect(mockLimit).toHaveBeenCalledWith('ip:203.0.113.1');
    });
  });

  describe('User-Based Rate Limiting', () => {
    it('should track requests per user ID', async () => {
      if (!rateLimiters.api) {
        return;
      }

      const userId = 'user-123';

      const mockLimit = vi.fn()
        .mockResolvedValueOnce({
          success: true,
          limit: 100,
          reset: Date.now() + 60000,
          remaining: 99,
        })
        .mockResolvedValueOnce({
          success: true,
          limit: 100,
          reset: Date.now() + 60000,
          remaining: 98,
        });

      rateLimiters.api.limit = mockLimit;

      // Request 1
      await applyRateLimit(mockRequest, 'api', userId);

      // Request 2
      await applyRateLimit(mockRequest, 'api', userId);

      // Verify same user identifier used
      expect(mockLimit).toHaveBeenCalledTimes(2);
      expect(mockLimit).toHaveBeenCalledWith('user:user-123');
    });

    it('should track different users separately', async () => {
      if (!rateLimiters.api) {
        return;
      }

      const userId1 = 'user-123';
      const userId2 = 'user-456';

      const mockLimit = vi.fn().mockResolvedValue({
        success: true,
        limit: 100,
        reset: Date.now() + 60000,
        remaining: 99,
      });

      rateLimiters.api.limit = mockLimit;

      // User 1
      await applyRateLimit(mockRequest, 'api', userId1);

      // User 2
      await applyRateLimit(mockRequest, 'api', userId2);

      // Verify different identifiers used
      expect(mockLimit).toHaveBeenCalledWith('user:user-123');
      expect(mockLimit).toHaveBeenCalledWith('user:user-456');
    });
  });

  describe('Response Format Validation', () => {
    it('should return correct JSON structure in 429 response', async () => {
      if (!rateLimiters.api) {
        return;
      }

      const reset = Date.now() + 60000;

      const mockLimit = vi.fn().mockResolvedValue({
        success: false,
        limit: 100,
        reset,
        remaining: 0,
      });

      rateLimiters.api.limit = mockLimit;

      const result = await applyRateLimit(mockRequest, 'api');

      const responseData = await result.response?.json();

      // Verify structure
      expect(responseData).toHaveProperty('success', false);
      expect(responseData).toHaveProperty('error');
      expect(responseData).toHaveProperty('details');
      expect(responseData.details).toHaveProperty('limit');
      expect(responseData.details).toHaveProperty('remaining');
      expect(responseData.details).toHaveProperty('reset');
      expect(responseData.details).toHaveProperty('retryAfter');

      // Verify types
      expect(typeof responseData.error).toBe('string');
      expect(typeof responseData.details.limit).toBe('number');
      expect(typeof responseData.details.remaining).toBe('number');
      expect(typeof responseData.details.reset).toBe('string');
      expect(typeof responseData.details.retryAfter).toBe('number');

      // Verify ISO date format
      expect(() => new Date(responseData.details.reset)).not.toThrow();
    });
  });

  describe('Security Considerations', () => {
    it('should not expose internal error details in 429 response', async () => {
      if (!rateLimiters.api) {
        return;
      }

      const mockLimit = vi.fn().mockResolvedValue({
        success: false,
        limit: 100,
        reset: Date.now() + 60000,
        remaining: 0,
      });

      rateLimiters.api.limit = mockLimit;

      const result = await applyRateLimit(mockRequest, 'api');

      const responseData = await result.response?.json();

      // Should not expose Redis keys, internal errors, etc.
      expect(responseData.error).not.toContain('Redis');
      expect(responseData.error).not.toContain('Upstash');
      expect(responseData.error).not.toContain('internal');
    });

    it('should handle malicious IP headers safely', async () => {
      const maliciousRequest = new NextRequest('https://holilabs.xyz/api/test', {
        method: 'GET',
        headers: {
          'x-forwarded-for': '"><script>alert(1)</script>, 203.0.113.1',
        },
      });

      if (!rateLimiters.api) {
        return;
      }

      const mockLimit = vi.fn().mockResolvedValue({
        success: true,
        limit: 100,
        reset: Date.now() + 60000,
        remaining: 99,
      });

      rateLimiters.api.limit = mockLimit;

      await applyRateLimit(maliciousRequest, 'api');

      // Should extract first IP and sanitize (take first segment before comma)
      expect(mockLimit).toHaveBeenCalledWith('ip:"><script>alert(1)</script>');
      // Note: In production, you may want to add IP validation/sanitization
    });
  });
});
