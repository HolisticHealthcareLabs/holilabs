import { test as base, Page } from '@playwright/test';
import { loginUser, logoutUser, DEFAULT_TEST_USER, TestUser } from './auth';

/**
 * Shared test fixtures for Playwright E2E tests.
 * Provides pre-configured page contexts with authentication state.
 */

/**
 * Fixture: Authenticated page (logged in as default test user)
 */
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    // Login before test
    await page.goto('/sign-in');
    await loginUser(page, DEFAULT_TEST_USER);

    // Use the authenticated page in the test
    await use(page);

    // Cleanup: logout after test
    await logoutUser(page).catch(() => {
      // Ignore logout errors in cleanup
    });
  },
});

/**
 * Fixture: Fresh unauthenticated page for each test
 */
export const testUnauthenticated = base.extend<{ unauthenticatedPage: Page }>({
  unauthenticatedPage: async ({ page }, use) => {
    // Ensure user is logged out
    await page.goto('/auth/logout').catch(() => null);
    await page.goto('/');

    // Use the unauthenticated page in the test
    await use(page);
  },
});

/**
 * Fixture: Page with custom user login
 */
export const testWithCustomUser = base.extend<{
  authenticatedPageCustom: (user: TestUser) => Promise<Page>;
}>({
  authenticatedPageCustom: async ({ page }, use) => {
    const loginAs = async (user: TestUser) => {
      await page.goto('/sign-in');
      await loginUser(page, user);
      return page;
    };

    await use(loginAs);

    // Cleanup
    await logoutUser(page).catch(() => null);
  },
});

// Re-export test utilities
export { expect } from '@playwright/test';
export * from './auth';
