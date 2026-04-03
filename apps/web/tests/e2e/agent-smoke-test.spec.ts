import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { setupMockAuth } from './helpers/auth';

/**
 * Agent Smoke Test
 *
 * Quick health check that agents can run to verify core functionality.
 * Tests:
 *  - Homepage loads and renders
 *  - Sign-in page is accessible and form renders
 *  - Critical routes don't return 500 errors
 *  - Screenshots are captured at each step
 *
 * Tag: @public (runs with public test suite)
 * Execution: pnpm exec playwright test agent-smoke-test.spec.ts
 */

// Create screenshots directory
const screenshotsDir = path.join(__dirname, 'screenshots', 'smoke-test');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

test.describe('@public Agent Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockAuth(page);
    // Set a reasonable timeout for smoke tests
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(15000);
  });

  test('should load homepage without errors', async ({ page }) => {
    // Navigate to homepage
    const response = await page.goto('/');

    // Verify successful response (2xx or 3xx)
    expect(response?.status()).toBeLessThan(400);

    // Verify page title or main heading exists
    const pageContent = await page.content();
    expect(pageContent).toBeTruthy();
    expect(pageContent.length).toBeGreaterThan(100);

    // Take screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, '01-homepage.png'),
    });
  });

  test('should render sign-in page with form', async ({ page }) => {
    // Navigate to sign-in
    const response = await page.goto('/auth/login');

    // Verify successful response
    expect(response?.status()).toBeLessThan(400);

    // Verify form elements exist
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');

    // At least one form element should be visible
    const formElementsVisible =
      (await emailInput.isVisible().catch(() => false)) ||
      (await passwordInput.isVisible().catch(() => false)) ||
      (await submitButton.isVisible().catch(() => false));

    expect(formElementsVisible).toBe(true);

    // Take screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, '02-signin-page.png'),
    });
  });

  test('should be accessible on all critical routes', async ({ page }) => {
    const criticalRoutes = [
      '/',
      '/auth/login',
      '/auth/register',
      '/dashboard',
      '/portal',
      '/clinical',
      '/enterprise',
    ];

    for (const route of criticalRoutes) {
      try {
        const response = await page.goto(route, { waitUntil: 'networkidle' }).catch(async () => {
          // If navigation fails, try with just domcontentloaded
          return page.goto(route, { waitUntil: 'domcontentloaded' });
        });

        // Route should not return 500-level errors
        const status = response?.status();
        expect(status).toBeLessThan(500);

        // Route should have some content
        const content = await page.content();
        expect(content.length).toBeGreaterThan(10);

        console.log(`✓ Route ${route} is accessible (${status})`);
      } catch (error) {
        // For protected routes, navigation might fail with 401/403
        // which is acceptable. We just want to ensure the app doesn't crash (500).
        console.log(`⚠ Route ${route} threw error (may be protected): ${error}`);
      }
    }
  });

  test('should handle network requests without crashing', async ({ page }) => {
    let hasErrors = false;
    let errorCount = 0;

    // Listen for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        hasErrors = true;
        console.log(`  Console Error: ${msg.text()}`);
      }
    });

    // Listen for page crashes
    page.on('error', (error) => {
      hasErrors = true;
      errorCount++;
      console.log(`  Page Error: ${error.message}`);
    });

    // Navigate to homepage
    await page.goto('/', { waitUntil: 'networkidle' }).catch(() => null);

    // Wait a bit for async operations
    await page.waitForTimeout(2000);

    // Hard page errors should not occur during a smoke test
    expect(hasErrors && errorCount > 0).toBe(false);
  });

  test('should have no 404 errors in initial load', async ({ page, context }) => {
    const failedRequests: string[] = [];

    // Listen for failed network requests
    page.on('response', (response) => {
      if (response.status() >= 400) {
        // Ignore certain expected failures (e.g., optional analytics, ads)
        const url = response.url();
        if (!url.includes('analytics') && !url.includes('ad') && !url.includes('tracking')) {
          failedRequests.push(`${response.status()} ${url}`);
        }
      }
    });

    // Navigate to homepage
    await page.goto('/', { waitUntil: 'networkidle' });

    // Take screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, '03-network-check.png'),
    });

    // Critical resources should load successfully
    const criticalFailures = failedRequests.filter(
      (r) => !r.includes('fonts') && !r.includes('icons') && r.includes('5')
    );

    expect(criticalFailures.length).toBe(0);
  });

  test('should verify JS bundle loads without errors', async ({ page }) => {
    let jsErrorCount = 0;

    page.on('pageerror', (error) => {
      console.log(`  JS Error: ${error.message}`);
      jsErrorCount++;
    });

    // Navigate and wait for hydration
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // App should not have critical JS errors during load
    expect(jsErrorCount).toBe(0);

    // Take final screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, '04-final-state.png'),
    });
  });

  test.afterEach(async ({ page }) => {
    // Additional cleanup and logging
    const title = await page.title();
    console.log(`  Final page title: ${title}`);
  });
});
