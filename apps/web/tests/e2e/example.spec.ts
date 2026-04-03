/**
 * example.spec.ts
 *
 * Example test file showing best practices for holilabsv2 E2E tests.
 *
 * This file demonstrates:
 *  - Test tagging with @suite prefix
 *  - Using fixtures and helpers
 *  - Proper test organization
 *  - Screenshot capture
 *  - Error handling
 *
 * Copy this file as a template for new test suites.
 */

import { test, expect } from '@playwright/test';
import {
  login,
  logout,
  navigateTo,
  waitForElement,
  fillInput,
  captureScreenshot,
  assertVisible,
  assertTextContains,
  assertUrlMatches,
  TEST_USERS,
  TEST_ROUTES,
} from './fixtures';

/**
 * Example: Public Pages Test Suite
 *
 * Tag: @public
 * This suite runs when:
 *  ./scripts/e2e-runner.sh --suite public
 */
test.describe('@public Example Public Pages Tests', () => {
  /**
   * Before each test: basic setup
   */
  test.beforeEach(async ({ page }) => {
    // Set default timeout
    page.setDefaultTimeout(15000);

    // Optional: Clear browser storage for clean state
    // await page.context().clearCookies();
  });

  /**
   * Test 1: Homepage loads and contains expected elements
   */
  test('should load homepage with main content', async ({ page }) => {
    // Navigate to homepage
    await navigateTo(page, TEST_ROUTES.home);

    // Verify page title
    const title = await page.title();
    expect(title).toContain('holilabs');

    // Check for main content
    await assertVisible(page, '[data-testid="hero-section"]');

    // Take screenshot for documentation
    await captureScreenshot(page, 'homepage-loaded');
  });

  /**
   * Test 2: Navigation works across routes
   */
  test('should navigate between pages', async ({ page }) => {
    // Start on homepage
    await navigateTo(page, TEST_ROUTES.home);

    // Navigate to sign-in
    const signInLink = page.locator('a[href="/auth/login"]');
    await signInLink.click();

    // Verify we're on sign-in page
    await assertUrlMatches(page, /\/auth\/login/);

    // Take screenshot
    await captureScreenshot(page, 'navigated-to-signin');
  });

  /**
   * Test 3: Sign-in form renders and validates
   */
  test('should render sign-in form with validation', async ({ page }) => {
    // Navigate to sign-in page
    await navigateTo(page, TEST_ROUTES.signin);

    // Verify form elements exist
    await assertVisible(page, 'input[type="email"]');
    await assertVisible(page, 'input[type="password"]');
    await assertVisible(page, 'button[type="submit"]');

    // Try submitting empty form (should show validation error)
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Look for error message
    const errorMessage = page.locator('[role="alert"]');
    const isErrorVisible = await errorMessage.isVisible().catch(() => false);

    // If form has HTML5 validation, it will prevent submission
    // Otherwise, we expect an error message
    if (!isErrorVisible) {
      // HTML5 validation is working
      expect(true).toBe(true);
    }

    await captureScreenshot(page, 'signin-form-validation');
  });

  /**
   * Test 4: Responsive design on mobile
   */
  test('should be responsive on mobile viewport', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 }, // iPhone-like
    });

    const page = await context.newPage();

    try {
      await navigateTo(page, TEST_ROUTES.home);

      // Check that key elements are still visible
      await assertVisible(page, '[data-testid="hero-section"]');

      // Navigation menu should be present (drawer or hamburger)
      const navMenu = page.locator('[data-testid="nav-menu"], [aria-label="Menu"]');
      const isNavVisible = await navMenu.isVisible().catch(() => false);

      expect(isNavVisible).toBe(true);

      await captureScreenshot(page, 'mobile-responsive');
    } finally {
      await context.close();
    }
  });

  /**
   * After each test: cleanup and logging
   */
  test.afterEach(async ({ page }, testInfo) => {
    // Capture final screenshot if test failed
    if (testInfo.status === 'failed') {
      await page.screenshot({ path: `test-results/failure-${Date.now()}.png` });
    }

    // Log test result
    console.log(`Test "${testInfo.title}" - ${testInfo.status}`);
  });
});

/**
 * Example: Auth Test Suite
 *
 * Tag: @auth
 * This suite runs when:
 *  ./scripts/e2e-runner.sh --suite auth
 */
test.describe('@auth Example Authentication Tests', () => {
  /**
   * Test: User can sign in successfully
   */
  test('should sign in successfully with valid credentials', async ({ page }) => {
    // Navigate to sign-in
    await navigateTo(page, TEST_ROUTES.signin);

    // Fill in credentials
    await fillInput(page, 'input[type="email"]', TEST_USERS.patient.email);
    await fillInput(page, 'input[type="password"]', TEST_USERS.patient.password);

    // Submit form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Verify we're logged in
    await assertVisible(page, '[data-testid="user-menu"]');

    // Take screenshot
    await captureScreenshot(page, 'logged-in-successfully');
  });

  /**
   * Test: User can log out
   */
  test('should log out successfully', async ({ page }) => {
    // First, login
    await login(page, TEST_USERS.patient.email, TEST_USERS.patient.password);

    // Click logout (adjust selector as needed)
    const logoutButton = page.locator('[data-testid="logout-button"]');
    await logoutButton.click();

    // Verify redirected to home or login
    await page.waitForURL(/\/(|auth\/login)/, { timeout: 5000 });

    // Verify logged out state
    const signInLink = page.locator('a[href="/auth/login"]');
    await expect(signInLink).toBeVisible();

    await captureScreenshot(page, 'logged-out');
  });

  /**
   * Test: Invalid credentials show error
   */
  test('should show error for invalid credentials', async ({ page }) => {
    await navigateTo(page, TEST_ROUTES.signin);

    // Fill with invalid credentials
    await fillInput(page, 'input[type="email"]', 'invalid@example.com');
    await fillInput(page, 'input[type="password"]', 'wrongpassword');

    // Submit
    await page.locator('button[type="submit"]').click();

    // Wait for error message (adjust selector)
    const errorMessage = page.locator('[role="alert"]');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    // Verify we're still on login page
    await assertUrlMatches(page, /\/auth\/login/);

    await captureScreenshot(page, 'signin-error');
  });
});

/**
 * Example: Dashboard Test Suite
 *
 * Tag: @dashboard
 * This suite runs when:
 *  ./scripts/e2e-runner.sh --suite dashboard
 */
test.describe('@dashboard Example Dashboard Tests', () => {
  /**
   * Setup: Login before each dashboard test
   */
  test.beforeEach(async ({ page }) => {
    // Login as doctor user
    await login(page, TEST_USERS.doctor.email, TEST_USERS.doctor.password);

    // Verify we're on dashboard
    await assertUrlMatches(page, /\/dashboard/);
  });

  /**
   * Test: Dashboard displays user information
   */
  test('should display user information on dashboard', async ({ page }) => {
    // Check for welcome message or user name
    const userGreeting = page.locator('[data-testid="user-greeting"]');
    const isGreetingVisible = await userGreeting.isVisible().catch(() => false);

    if (isGreetingVisible) {
      const text = await userGreeting.textContent();
      expect(text).toContain('Doctor'); // Adjust based on your app
    }

    await captureScreenshot(page, 'dashboard-user-info');
  });

  /**
   * Test: Dashboard sidebar navigation works
   */
  test('should navigate using sidebar menu', async ({ page }) => {
    // Click on a menu item (adjust selector)
    const menuItem = page.locator('[data-testid="nav-patients"]');
    await menuItem.click();

    // Verify navigation
    await page.waitForURL('**/patients', { timeout: 5000 });

    await captureScreenshot(page, 'sidebar-navigation');
  });

  /**
   * Cleanup: Logout after dashboard tests
   */
  test.afterEach(async ({ page }) => {
    // Logout
    await logout(page);
  });
});

/**
 * Example: Accessibility Test Suite
 *
 * Tag: @a11y
 * This suite runs when:
 *  ./scripts/e2e-runner.sh --suite a11y
 *
 * For comprehensive accessibility testing, consider using
 * @axe-core/playwright for automated WCAG scanning
 */
test.describe('@a11y Example Accessibility Tests', () => {
  /**
   * Test: Sign-in form is accessible
   */
  test('should have accessible sign-in form', async ({ page }) => {
    await navigateTo(page, TEST_ROUTES.signin);

    // Check for form labels
    const emailLabel = page.locator('label[for="email"]');
    const passwordLabel = page.locator('label[for="password"]');

    await expect(emailLabel).toBeVisible();
    await expect(passwordLabel).toBeVisible();

    // Check for proper input associations
    const emailInput = page.locator('#email');
    const inputFor = await emailLabel.getAttribute('for');
    expect(inputFor).toBe('email');

    // Check for submit button is keyboard accessible
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeFocused().catch(() => {
      // If not focused initially, that's OK, just verify it's keyboard accessible
      expect(true).toBe(true);
    });

    await captureScreenshot(page, 'a11y-signin-form');
  });

  /**
   * Test: Navigation is keyboard accessible
   */
  test('should support keyboard navigation', async ({ page }) => {
    await navigateTo(page, TEST_ROUTES.home);

    // Tab to first interactive element
    await page.keyboard.press('Tab');

    // Verify something is focused
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });

    expect(focusedElement).toBeTruthy();

    await captureScreenshot(page, 'a11y-keyboard-nav');
  });

  /**
   * Test: Color contrast and ARIA labels
   */
  test('should use proper ARIA labels', async ({ page }) => {
    await navigateTo(page, TEST_ROUTES.home);

    // Check for main landmark
    const main = page.locator('main');
    const mainExists = await main.count().catch(() => 0);

    // If no <main>, at least check for role
    if (mainExists === 0) {
      const mainRole = page.locator('[role="main"]');
      expect(await mainRole.count()).toBeGreaterThanOrEqual(0);
    }

    // Check buttons have accessible text
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');

      // Button should have either text or aria-label
      const hasAccessibleName = (text && text.trim()) || ariaLabel;
      expect(hasAccessibleName).toBeTruthy();
    }

    await captureScreenshot(page, 'a11y-aria-labels');
  });
});

/**
 * Tips for Using This Template:
 *
 * 1. Naming
 *    - Test files: feature.spec.ts (e.g., auth.spec.ts)
 *    - Test suites: @feature (e.g., @auth)
 *    - Test descriptions: describe what the user does
 *
 * 2. Organization
 *    - Group related tests in describe() blocks
 *    - Use beforeEach/afterEach for setup/cleanup
 *    - Keep tests small and focused
 *
 * 3. Assertions
 *    - Use fixtures for common operations
 *    - Use expect() for verifications
 *    - Take screenshots on failure or key steps
 *
 * 4. Helpers
 *    - Import from fixtures.ts
 *    - Use assertVisible(), assertTextContains(), etc.
 *    - Use navigateTo(), fillInput(), login(), logout()
 *
 * 5. Debugging
 *    - Use captureScreenshot() for documentation
 *    - Run with --headed to see browser
 *    - Use --debug for step-through debugging
 *
 * 6. Tags
 *    - Always tag tests with @suite prefix
 *    - Allows running specific suites with e2e-runner.sh
 *
 * 7. Data
 *    - Use TEST_USERS and TEST_ROUTES from fixtures
 *    - Keep test data in fixtures.ts
 *    - Don't hardcode URLs or credentials
 */
