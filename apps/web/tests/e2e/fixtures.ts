/**
 * Playwright Test Fixtures & Helpers
 *
 * Shared test utilities for E2E tests:
 *  - Custom fixtures (authenticated user, mock data, etc.)
 *  - Helper functions (login, navigation, assertions)
 *  - Test configuration
 */

import { test as base, expect } from '@playwright/test';
import * as path from 'path';

// ============================================================================
// Custom Fixtures
// ============================================================================

type AuthFixture = {
  authenticatedPage: { page: any; user: any };
};

export const test = base.extend<AuthFixture>({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to sign-in
    await page.goto('/auth/login');

    // Fill in test credentials
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testPassword123!');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');

    // Extract user info if available
    const user = {
      email: 'test@example.com',
      role: 'user',
    };

    // Pass to test
    await use({
      page,
      user,
    });

    // Cleanup: logout
    try {
      await page.goto('/logout');
    } catch {
      // Logout may fail, that's okay
    }
  },
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Login with given credentials
 */
export async function login(page: any, email: string, password: string): Promise<void> {
  await page.goto('/auth/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
}

/**
 * Logout (navigate away from authenticated state)
 */
export async function logout(page: any): Promise<void> {
  try {
    await page.goto('/logout');
  } catch {
    // May fail on certain routes, that's acceptable
  }
}

/**
 * Navigate and wait for ready state
 */
export async function navigateTo(
  page: any,
  path: string,
  options?: { waitUntil?: string }
): Promise<void> {
  await page.goto(path, {
    waitUntil: options?.waitUntil || 'domcontentloaded',
  });
}

/**
 * Wait for element and check visibility
 */
export async function waitForElement(
  page: any,
  selector: string,
  timeout: number = 5000
): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout });
    return await page.locator(selector).isVisible();
  } catch {
    return false;
  }
}

/**
 * Fill form field
 */
export async function fillInput(page: any, selector: string, value: string): Promise<void> {
  const field = page.locator(selector);
  await field.fill(value);
}

/**
 * Click element and wait for response
 */
export async function clickAndWait(page: any, selector: string, waitFor?: string): Promise<void> {
  const [, response] = await Promise.all([
    page.click(selector),
    waitFor ? page.waitForLoadState(waitFor) : Promise.resolve(),
  ]);
}

/**
 * Take screenshot for debugging
 */
export async function captureScreenshot(page: any, filename: string): Promise<void> {
  const screenshotDir = path.join(__dirname, 'screenshots');
  const filepath = path.join(screenshotDir, `${filename}.png`);

  // Create directory if it doesn't exist
  const fs = require('fs');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  await page.screenshot({ path: filepath, fullPage: true });
}

/**
 * Get element text
 */
export async function getElementText(page: any, selector: string): Promise<string | null> {
  try {
    return await page.locator(selector).textContent();
  } catch {
    return null;
  }
}

/**
 * Check if element has class
 */
export async function hasClass(page: any, selector: string, className: string): Promise<boolean> {
  const element = page.locator(selector);
  const classes = await element.getAttribute('class');
  return classes?.includes(className) || false;
}

/**
 * Wait for element to disappear
 */
export async function waitForElementToDisappear(
  page: any,
  selector: string,
  timeout: number = 5000
): Promise<void> {
  await page.waitForSelector(selector, { state: 'hidden', timeout });
}

/**
 * Clear all cookies and local storage
 */
export async function clearBrowserStorage(page: any): Promise<void> {
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => sessionStorage.clear());
}

// ============================================================================
// Common Test Data
// ============================================================================

export const TEST_USERS = {
  admin: {
    email: 'admin@holilabs.xyz',
    password: 'AdminPass123!',
    role: 'admin',
  },
  doctor: {
    email: 'doctor@holilabs.xyz',
    password: 'DoctorPass123!',
    role: 'doctor',
  },
  patient: {
    email: 'patient@holilabs.xyz',
    password: 'PatientPass123!',
    role: 'patient',
  },
  enterprise: {
    email: 'enterprise@holilabs.xyz',
    password: 'EnterprisePass123!',
    role: 'enterprise',
  },
};

export const TEST_ROUTES = {
  home: '/',
  signin: '/auth/login',
  signup: '/auth/register',
  dashboard: '/dashboard',
  portal: '/portal',
  clinical: '/clinical',
  enterprise: '/enterprise',
  notFound: '/not-found-page-xyz',
};

// ============================================================================
// Assertions
// ============================================================================

/**
 * Assert element is visible
 */
export async function assertVisible(page: any, selector: string): Promise<void> {
  const element = page.locator(selector);
  await expect(element).toBeVisible();
}

/**
 * Assert element is not visible
 */
export async function assertNotVisible(page: any, selector: string): Promise<void> {
  const element = page.locator(selector);
  await expect(element).not.toBeVisible();
}

/**
 * Assert element contains text
 */
export async function assertTextContains(
  page: any,
  selector: string,
  text: string
): Promise<void> {
  const element = page.locator(selector);
  await expect(element).toContainText(text);
}

/**
 * Assert URL matches pattern
 */
export async function assertUrlMatches(page: any, pattern: string | RegExp): Promise<void> {
  await expect(page).toHaveURL(pattern);
}

/**
 * Assert response status code
 */
export async function assertResponseStatus(
  page: any,
  url: string,
  expectedStatus: number
): Promise<void> {
  const response = await page.goto(url);
  expect(response?.status()).toBe(expectedStatus);
}

// ============================================================================
// Test Configuration
// ============================================================================

/**
 * Global test configuration
 */
export const TEST_CONFIG = {
  baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
  timeout: 30000,
  navigationTimeout: 15000,
  screenshotDir: 'tests/e2e/screenshots',
  videoDir: 'tests/e2e/videos',
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : 4,
};

export { expect };
