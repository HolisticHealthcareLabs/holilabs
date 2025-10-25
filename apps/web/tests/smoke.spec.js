"use strict";
/**
 * Smoke Tests
 *
 * Critical path tests that verify the application is functioning.
 * Run these after deployment to ensure basic functionality.
 *
 * Usage:
 *   pnpm test:e2e tests/smoke.spec.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
test_1.test.describe('Smoke Tests', () => {
    test_1.test.describe('Health Checks', () => {
        (0, test_1.test)('should return basic health status', async ({ request }) => {
            const response = await request.get(`${BASE_URL}/api/health`);
            (0, test_1.expect)(response.status()).toBe(200);
            const body = await response.json();
            (0, test_1.expect)(body).toHaveProperty('status', 'ok');
            (0, test_1.expect)(body).toHaveProperty('timestamp');
        });
        (0, test_1.test)('should return liveness probe', async ({ request }) => {
            const response = await request.get(`${BASE_URL}/api/health/live`);
            (0, test_1.expect)(response.status()).toBe(200);
            const body = await response.json();
            (0, test_1.expect)(body).toHaveProperty('status', 'ok');
            (0, test_1.expect)(body).toHaveProperty('uptime');
            (0, test_1.expect)(body).toHaveProperty('pid');
            (0, test_1.expect)(body).toHaveProperty('memory');
        });
        (0, test_1.test)('should return readiness probe', async ({ request }) => {
            const response = await request.get(`${BASE_URL}/api/health/ready`);
            // Should be either 200 (ready) or 503 (not ready)
            (0, test_1.expect)([200, 503]).toContain(response.status());
            const body = await response.json();
            (0, test_1.expect)(body).toHaveProperty('status');
            (0, test_1.expect)(body).toHaveProperty('checks');
            // Verify structure of checks
            (0, test_1.expect)(body.checks).toHaveProperty('database');
            (0, test_1.expect)(body.checks.database).toHaveProperty('status');
            (0, test_1.expect)(body.checks.database).toHaveProperty('required');
        });
    });
    test_1.test.describe('Public Pages', () => {
        (0, test_1.test)('should load home page', async ({ page }) => {
            await page.goto(BASE_URL);
            // Wait for page to load
            await page.waitForLoadState('networkidle');
            // Check that we're not getting an error page
            const title = await page.title();
            (0, test_1.expect)(title).toBeTruthy();
            // Should not show Next.js error
            const errorText = page.locator('text=Application error');
            await (0, test_1.expect)(errorText).not.toBeVisible();
        });
        (0, test_1.test)('should load login page', async ({ page }) => {
            await page.goto(`${BASE_URL}/auth/login`);
            await page.waitForLoadState('networkidle');
            // Should have login form elements
            const emailInput = page.locator('input[type="email"]');
            const passwordInput = page.locator('input[type="password"]');
            await (0, test_1.expect)(emailInput).toBeVisible();
            await (0, test_1.expect)(passwordInput).toBeVisible();
        });
        (0, test_1.test)('should load patient portal login', async ({ page }) => {
            await page.goto(`${BASE_URL}/portal/login`);
            await page.waitForLoadState('networkidle');
            // Should have patient login options
            const heading = page.locator('h1, h2').first();
            await (0, test_1.expect)(heading).toBeVisible();
        });
    });
    test_1.test.describe('API Security', () => {
        (0, test_1.test)('should require authentication for protected endpoints', async ({ request }) => {
            const protectedEndpoints = [
                '/api/patients',
                '/api/appointments',
                '/api/messages',
                '/api/push/send',
            ];
            for (const endpoint of protectedEndpoints) {
                const response = await request.get(`${BASE_URL}${endpoint}`);
                // Should return 401 Unauthorized
                (0, test_1.expect)(response.status()).toBe(401);
            }
        });
        (0, test_1.test)('should apply rate limiting', async ({ request }) => {
            // Make multiple requests quickly to trigger rate limit
            const requests = Array(10).fill(null).map(() => request.post(`${BASE_URL}/api/auth/patient/magic-link/send`, {
                data: { email: 'test@example.com' }
            }));
            const responses = await Promise.all(requests);
            // At least one should be rate limited
            const rateLimited = responses.some(r => r.status() === 429);
            (0, test_1.expect)(rateLimited).toBe(true);
        });
        (0, test_1.test)('should have security headers', async ({ request }) => {
            const response = await request.get(`${BASE_URL}/api/health`);
            const headers = response.headers();
            // Check for security headers
            (0, test_1.expect)(headers).toHaveProperty('x-content-type-options', 'nosniff');
            (0, test_1.expect)(headers).toHaveProperty('x-frame-options');
            (0, test_1.expect)(headers).toHaveProperty('strict-transport-security');
        });
    });
    test_1.test.describe('Static Assets', () => {
        (0, test_1.test)('should serve favicon', async ({ request }) => {
            const response = await request.get(`${BASE_URL}/favicon.ico`);
            (0, test_1.expect)([200, 304]).toContain(response.status());
        });
        (0, test_1.test)('should serve manifest.json', async ({ request }) => {
            const response = await request.get(`${BASE_URL}/manifest.json`);
            (0, test_1.expect)([200, 304]).toContain(response.status());
            if (response.status() === 200) {
                const manifest = await response.json();
                (0, test_1.expect)(manifest).toHaveProperty('name');
                (0, test_1.expect)(manifest).toHaveProperty('short_name');
                (0, test_1.expect)(manifest).toHaveProperty('icons');
            }
        });
        (0, test_1.test)('should serve PWA icons', async ({ request }) => {
            const icons = [
                '/icon-192x192.png',
                '/icon-512x512.png',
            ];
            for (const icon of icons) {
                const response = await request.get(`${BASE_URL}${icon}`);
                (0, test_1.expect)([200, 304, 404]).toContain(response.status());
            }
        });
    });
    test_1.test.describe('Error Handling', () => {
        (0, test_1.test)('should return 404 for non-existent pages', async ({ page }) => {
            const response = await page.goto(`${BASE_URL}/non-existent-page-12345`);
            (0, test_1.expect)(response?.status()).toBe(404);
        });
        (0, test_1.test)('should return 404 for non-existent API endpoints', async ({ request }) => {
            const response = await request.get(`${BASE_URL}/api/non-existent-endpoint`);
            (0, test_1.expect)(response.status()).toBe(404);
        });
        (0, test_1.test)('should handle malformed JSON in API requests', async ({ request }) => {
            const response = await request.post(`${BASE_URL}/api/patients`, {
                headers: {
                    'Content-Type': 'application/json',
                },
                data: 'invalid json{',
            });
            (0, test_1.expect)([400, 401]).toContain(response.status());
        });
    });
    test_1.test.describe('Performance', () => {
        (0, test_1.test)('health check should respond quickly', async ({ request }) => {
            const start = Date.now();
            const response = await request.get(`${BASE_URL}/api/health`);
            const duration = Date.now() - start;
            (0, test_1.expect)(response.status()).toBe(200);
            (0, test_1.expect)(duration).toBeLessThan(1000); // Should respond within 1 second
        });
        (0, test_1.test)('home page should load within 3 seconds', async ({ page }) => {
            const start = Date.now();
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');
            const duration = Date.now() - start;
            (0, test_1.expect)(duration).toBeLessThan(3000); // Should load within 3 seconds
        });
    });
    test_1.test.describe('Database Connectivity', () => {
        (0, test_1.test)('readiness check should verify database connection', async ({ request }) => {
            const response = await request.get(`${BASE_URL}/api/health/ready`);
            const body = await response.json();
            // Database check should exist
            (0, test_1.expect)(body.checks).toHaveProperty('database');
            (0, test_1.expect)(body.checks.database).toHaveProperty('status');
            // If database is required and unhealthy, overall status should be unhealthy
            if (body.checks.database.required && body.checks.database.status === 'unhealthy') {
                (0, test_1.expect)(body.status).toBe('unhealthy');
                (0, test_1.expect)(response.status()).toBe(503);
            }
        });
    });
    test_1.test.describe('CORS', () => {
        (0, test_1.test)('should allow configured origins', async ({ request }) => {
            const response = await request.get(`${BASE_URL}/api/health`, {
                headers: {
                    'Origin': 'http://localhost:3000',
                },
            });
            const headers = response.headers();
            (0, test_1.expect)(headers).toHaveProperty('access-control-allow-origin');
        });
        (0, test_1.test)('should handle preflight requests', async ({ request }) => {
            const response = await request.fetch(`${BASE_URL}/api/health`, {
                method: 'OPTIONS',
                headers: {
                    'Origin': 'http://localhost:3000',
                    'Access-Control-Request-Method': 'GET',
                },
            });
            (0, test_1.expect)([200, 204]).toContain(response.status());
            const headers = response.headers();
            (0, test_1.expect)(headers).toHaveProperty('access-control-allow-methods');
        });
    });
});
test_1.test.describe('Critical User Flows', () => {
    (0, test_1.test)('clinician login flow should be accessible', async ({ page }) => {
        await page.goto(`${BASE_URL}/auth/login`);
        // Check that critical elements are present
        const emailInput = page.locator('input[type="email"]');
        const submitButton = page.locator('button[type="submit"]');
        await (0, test_1.expect)(emailInput).toBeVisible();
        await (0, test_1.expect)(submitButton).toBeVisible();
    });
    (0, test_1.test)('patient portal should be accessible', async ({ page }) => {
        await page.goto(`${BASE_URL}/portal/login`);
        await page.waitForLoadState('networkidle');
        // Patient portal should load without errors
        const errorMessage = page.locator('text=/error|not found/i');
        await (0, test_1.expect)(errorMessage).not.toBeVisible();
    });
});
test_1.test.describe('Sentry Integration', () => {
    (0, test_1.test)('should have Sentry configured (in production)', async ({ page }) => {
        // Only check in production
        if (BASE_URL.includes('localhost')) {
            test_1.test.skip();
        }
        await page.goto(BASE_URL);
        // Check if Sentry is loaded (by checking window.Sentry exists)
        const hasSentry = await page.evaluate(() => {
            return typeof window.Sentry !== 'undefined';
        });
        // In production, Sentry should be loaded
        (0, test_1.expect)(hasSentry).toBe(true);
    });
});
//# sourceMappingURL=smoke.spec.js.map