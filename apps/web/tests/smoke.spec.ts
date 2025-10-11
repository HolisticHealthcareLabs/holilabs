/**
 * Smoke Tests
 *
 * Critical path tests that verify the application is functioning.
 * Run these after deployment to ensure basic functionality.
 *
 * Usage:
 *   pnpm test:e2e tests/smoke.spec.ts
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Smoke Tests', () => {
  test.describe('Health Checks', () => {
    test('should return basic health status', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/health`);

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('status', 'ok');
      expect(body).toHaveProperty('timestamp');
    });

    test('should return liveness probe', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/health/live`);

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('status', 'ok');
      expect(body).toHaveProperty('uptime');
      expect(body).toHaveProperty('pid');
      expect(body).toHaveProperty('memory');
    });

    test('should return readiness probe', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/health/ready`);

      // Should be either 200 (ready) or 503 (not ready)
      expect([200, 503]).toContain(response.status());

      const body = await response.json();
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('checks');

      // Verify structure of checks
      expect(body.checks).toHaveProperty('database');
      expect(body.checks.database).toHaveProperty('status');
      expect(body.checks.database).toHaveProperty('required');
    });
  });

  test.describe('Public Pages', () => {
    test('should load home page', async ({ page }) => {
      await page.goto(BASE_URL);

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Check that we're not getting an error page
      const title = await page.title();
      expect(title).toBeTruthy();

      // Should not show Next.js error
      const errorText = page.locator('text=Application error');
      await expect(errorText).not.toBeVisible();
    });

    test('should load login page', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/login`);

      await page.waitForLoadState('networkidle');

      // Should have login form elements
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');

      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
    });

    test('should load patient portal login', async ({ page }) => {
      await page.goto(`${BASE_URL}/portal/login`);

      await page.waitForLoadState('networkidle');

      // Should have patient login options
      const heading = page.locator('h1, h2').first();
      await expect(heading).toBeVisible();
    });
  });

  test.describe('API Security', () => {
    test('should require authentication for protected endpoints', async ({ request }) => {
      const protectedEndpoints = [
        '/api/patients',
        '/api/appointments',
        '/api/messages',
        '/api/push/send',
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request.get(`${BASE_URL}${endpoint}`);

        // Should return 401 Unauthorized
        expect(response.status()).toBe(401);
      }
    });

    test('should apply rate limiting', async ({ request }) => {
      // Make multiple requests quickly to trigger rate limit
      const requests = Array(10).fill(null).map(() =>
        request.post(`${BASE_URL}/api/auth/patient/magic-link/send`, {
          data: { email: 'test@example.com' }
        })
      );

      const responses = await Promise.all(requests);

      // At least one should be rate limited
      const rateLimited = responses.some(r => r.status() === 429);
      expect(rateLimited).toBe(true);
    });

    test('should have security headers', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/health`);

      const headers = response.headers();

      // Check for security headers
      expect(headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(headers).toHaveProperty('x-frame-options');
      expect(headers).toHaveProperty('strict-transport-security');
    });
  });

  test.describe('Static Assets', () => {
    test('should serve favicon', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/favicon.ico`);

      expect([200, 304]).toContain(response.status());
    });

    test('should serve manifest.json', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/manifest.json`);

      expect([200, 304]).toContain(response.status());

      if (response.status() === 200) {
        const manifest = await response.json();
        expect(manifest).toHaveProperty('name');
        expect(manifest).toHaveProperty('short_name');
        expect(manifest).toHaveProperty('icons');
      }
    });

    test('should serve PWA icons', async ({ request }) => {
      const icons = [
        '/icon-192x192.png',
        '/icon-512x512.png',
      ];

      for (const icon of icons) {
        const response = await request.get(`${BASE_URL}${icon}`);
        expect([200, 304, 404]).toContain(response.status());
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should return 404 for non-existent pages', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/non-existent-page-12345`);

      expect(response?.status()).toBe(404);
    });

    test('should return 404 for non-existent API endpoints', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/non-existent-endpoint`);

      expect(response.status()).toBe(404);
    });

    test('should handle malformed JSON in API requests', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/patients`, {
        headers: {
          'Content-Type': 'application/json',
        },
        data: 'invalid json{',
      });

      expect([400, 401]).toContain(response.status());
    });
  });

  test.describe('Performance', () => {
    test('health check should respond quickly', async ({ request }) => {
      const start = Date.now();
      const response = await request.get(`${BASE_URL}/api/health`);
      const duration = Date.now() - start;

      expect(response.status()).toBe(200);
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });

    test('home page should load within 3 seconds', async ({ page }) => {
      const start = Date.now();
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(3000); // Should load within 3 seconds
    });
  });

  test.describe('Database Connectivity', () => {
    test('readiness check should verify database connection', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/health/ready`);

      const body = await response.json();

      // Database check should exist
      expect(body.checks).toHaveProperty('database');
      expect(body.checks.database).toHaveProperty('status');

      // If database is required and unhealthy, overall status should be unhealthy
      if (body.checks.database.required && body.checks.database.status === 'unhealthy') {
        expect(body.status).toBe('unhealthy');
        expect(response.status()).toBe(503);
      }
    });
  });

  test.describe('CORS', () => {
    test('should allow configured origins', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/health`, {
        headers: {
          'Origin': 'http://localhost:3000',
        },
      });

      const headers = response.headers();
      expect(headers).toHaveProperty('access-control-allow-origin');
    });

    test('should handle preflight requests', async ({ request }) => {
      const response = await request.fetch(`${BASE_URL}/api/health`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET',
        },
      });

      expect([200, 204]).toContain(response.status());

      const headers = response.headers();
      expect(headers).toHaveProperty('access-control-allow-methods');
    });
  });
});

test.describe('Critical User Flows', () => {
  test('clinician login flow should be accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);

    // Check that critical elements are present
    const emailInput = page.locator('input[type="email"]');
    const submitButton = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(submitButton).toBeVisible();
  });

  test('patient portal should be accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/portal/login`);

    await page.waitForLoadState('networkidle');

    // Patient portal should load without errors
    const errorMessage = page.locator('text=/error|not found/i');
    await expect(errorMessage).not.toBeVisible();
  });
});

test.describe('Sentry Integration', () => {
  test('should have Sentry configured (in production)', async ({ page }) => {
    // Only check in production
    if (BASE_URL.includes('localhost')) {
      test.skip();
    }

    await page.goto(BASE_URL);

    // Check if Sentry is loaded (by checking window.Sentry exists)
    const hasSentry = await page.evaluate(() => {
      return typeof (window as any).Sentry !== 'undefined';
    });

    // In production, Sentry should be loaded
    expect(hasSentry).toBe(true);
  });
});
