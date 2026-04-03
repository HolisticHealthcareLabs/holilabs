import { Page, expect } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export const DEFAULT_TEST_USER: TestUser = {
  email: 'test@holilabs.xyz',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
};

const MOCK_SESSION = {
  user: {
    id: 'test-user-e2e',
    name: 'Dr. Test',
    email: 'test@holilabs.xyz',
    role: 'DOCTOR',
    workspaceId: 'ws-e2e',
  },
  expires: '2027-12-31T23:59:59.999Z',
};

/**
 * Mocks NextAuth session + CSRF + callback at the network level.
 * Call this before navigating to any protected route.
 */
export async function setupMockAuth(page: Page) {
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_SESSION),
    });
  });

  await page.route('**/api/auth/csrf', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ csrfToken: 'mock-csrf-token' }),
    });
  });

  await page.route('**/api/auth/callback/credentials', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ url: '/dashboard' }),
    });
  });
}

/**
 * Logs in a user via the sign-in form with network-level auth mocking.
 */
export async function loginUser(page: Page, user: TestUser = DEFAULT_TEST_USER) {
  await setupMockAuth(page);

  await page.goto('/auth/login');

  const emailInput = page.locator('input[type="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();

  await emailInput.fill(user.email);
  await passwordInput.fill(user.password);

  // Check the Terms of Service checkbox
  const tosLabel = page.locator('label:has(input[type="checkbox"])');
  if (await tosLabel.isVisible().catch(() => false)) {
    await tosLabel.click();
  }

  const submitButton = page.locator('button[type="submit"]').first();
  await expect(submitButton).toBeEnabled({ timeout: 5000 });
  await submitButton.click();

  await page.waitForURL((url) => !url.pathname.includes('/auth/login'), {
    timeout: 10_000,
  }).catch(() => {});
}

export async function logoutUser(page: Page) {
  const logoutButton = page.locator('button, a').filter({
    hasText: /logout|sign out/i,
  });

  if (await logoutButton.isVisible()) {
    await logoutButton.click();
  } else {
    await page.goto('/auth/logout');
  }

  await page.waitForURL((url) => {
    return (
      url.pathname.includes('login') ||
      url.pathname === '/' ||
      url.pathname.includes('auth')
    );
  }).catch(() => {});
}

export async function registerUser(page: Page, user: TestUser) {
  await page.goto('/auth/register');

  const firstNameInput = page.locator('input[placeholder*="First"]').first();
  const lastNameInput = page.locator('input[placeholder*="Last"]').first();
  const emailInput = page.locator('input[type="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  const confirmPasswordInput = page.locator('input[type="password"]').nth(1);
  const submitButton = page.locator('button[type="submit"]').first();

  if (user.firstName) await firstNameInput.fill(user.firstName);
  if (user.lastName) await lastNameInput.fill(user.lastName);

  await emailInput.fill(user.email);
  await passwordInput.fill(user.password);
  await confirmPasswordInput.fill(user.password);
  await submitButton.click();

  await page.waitForURL((url) => {
    return (
      url.pathname.includes('dashboard') ||
      url.pathname.includes('verify') ||
      url.pathname.includes('success')
    );
  }).catch(() => {});
}

export async function goToSignIn(page: Page) {
  await page.goto('/auth/login');
  await expect(
    page.locator('input[type="email"]').first()
  ).toBeVisible();
}

export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    const userMenu = page.locator('[data-testid="user-menu"]');
    const dashboardLink = page.locator('a[href*="/dashboard"]');
    return (
      (await userMenu.isVisible().catch(() => false)) ||
      (await dashboardLink.isVisible().catch(() => false))
    );
  } catch {
    return false;
  }
}

export async function initiatePasswordReset(page: Page, email: string) {
  await page.goto('/auth/forgot-password');

  const emailInput = page.locator('input[type="email"]').first();
  const submitButton = page.locator('button[type="submit"]').first();

  await emailInput.fill(email);
  await submitButton.click();

  await expect(
    page.locator('text=/check your email|reset link sent/i')
  ).toBeVisible({ timeout: 5_000 });
}

export async function verifyProtectedRoute(page: Page, protectedUrl: string) {
  await page.goto('/auth/logout');
  await page.goto(protectedUrl);
  await expect(page).toHaveURL(/auth/);
}
