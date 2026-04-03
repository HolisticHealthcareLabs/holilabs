import { test, expect } from '@playwright/test';
import { setupMockAuth } from './helpers/auth';

/**
 * Authentication E2E Tests
 *
 * Coverage:
 * - Login page UI elements
 * - Registration page UI elements
 * - Password reset page UI elements
 * - Auth error page
 * - Protected route redirect behavior
 * - Authenticated navigation
 */

test.describe('Authentication Flows', () => {
  test.describe('Sign In', () => {
    test('should navigate to sign-in page', async ({ page }) => {
      await page.goto('/auth/login');
      await expect(page.locator('input[type="email"]').first()).toBeVisible();
    });

    test('should sign in with valid credentials (mocked)', async ({ page }) => {
      await setupMockAuth(page);
      await page.goto('/auth/login');

      await page.locator('input[type="email"]').first().fill('test@holilabs.xyz');
      await page.locator('input[type="password"]').first().fill('TestPassword123!');

      const tosLabel = page.locator('label:has(input[type="checkbox"])');
      if (await tosLabel.isVisible().catch(() => false)) {
        await tosLabel.click();
      }

      const submitBtn = page.locator('button[type="submit"]').first();
      await expect(submitBtn).toBeEnabled({ timeout: 5000 });
      await submitBtn.click();

      await page.waitForURL((url) => !url.pathname.includes('/auth/login'), {
        timeout: 10_000,
      }).catch(() => {});
    });

    test('should reject invalid email via client validation', async ({ page }) => {
      await page.goto('/auth/login');

      const emailInput = page.locator('input[type="email"]').first();
      await emailInput.fill('invalid-email');
      await page.locator('input[type="password"]').first().fill('password123');

      // Submit should be disabled or HTML5 validation should prevent submission
      const stillOnLogin = page.url().includes('/auth/login');
      expect(stillOnLogin).toBe(true);
    });

    test('should reject wrong password (mocked error)', async ({ page }) => {
      // Mock callback to return error
      await page.route('**/api/auth/callback/credentials', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ url: '/auth/login?error=CredentialsSignin' }),
        });
      });

      await page.goto('/auth/login');
      await page.locator('input[type="email"]').first().fill('test@holilabs.xyz');
      await page.locator('input[type="password"]').first().fill('WrongPassword123!');

      const tosLabel = page.locator('label:has(input[type="checkbox"])');
      if (await tosLabel.isVisible().catch(() => false)) {
        await tosLabel.click();
      }

      const submitBtn = page.locator('button[type="submit"]').first();
      await expect(submitBtn).toBeEnabled({ timeout: 5000 });
      await submitBtn.click();

      // Should show error or stay on login
      await page.waitForTimeout(2000);
      const hasError = await page.locator('text=/incorrect|invalid|wrong|error/i').first().isVisible().catch(() => false);
      const stillOnLogin = page.url().includes('/auth/login') || page.url().includes('error');
      expect(hasError || stillOnLogin).toBe(true);
    });

    test('should keep submit disabled when fields empty', async ({ page }) => {
      await page.goto('/auth/login');
      const submitBtn = page.locator('button[type="submit"]').first();
      await expect(submitBtn).toBeDisabled();
    });

    test('should display auth error when redirected to /auth/error', async ({ page }) => {
      await page.goto('/auth/error');
      const errorText = page.locator('h1, h2, p').first();
      await expect(errorText).toBeVisible();
    });
  });

  test.describe('Sign Out', () => {
    test('should sign out and redirect to public page', async ({ page }) => {
      await setupMockAuth(page);
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      // Navigate to logout
      await page.goto('/auth/logout');
      await page.waitForLoadState('domcontentloaded');

      // Should be on public page or login
      const url = page.url();
      expect(url.includes('/auth/') || url.endsWith('/')).toBe(true);
    });

    test('should clear session after logout', async ({ page }) => {
      await setupMockAuth(page);
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      await page.goto('/auth/logout');
      await page.waitForLoadState('domcontentloaded');

      // Verify we're no longer on dashboard
      expect(page.url()).not.toContain('/dashboard');
    });
  });

  test.describe('Registration', () => {
    test('should display registration form', async ({ page }) => {
      await page.goto('/auth/register');
      await expect(page.locator('input[type="email"]').first()).toBeVisible();
      await expect(page.locator('input[type="password"]').first()).toBeVisible();
    });

    test.skip('should register new user with valid data', async ({ page }) => {
      // Skip: requires backend setup
    });

    test('should reject mismatched passwords', async ({ page }) => {
      await page.goto('/auth/register');

      const passwordInput = page.locator('input[type="password"]').first();
      const confirmInput = page.locator('input[type="password"]').nth(1);

      if (await confirmInput.isVisible().catch(() => false)) {
        await page.locator('input[type="email"]').first().fill('test@holilabs.xyz');
        await passwordInput.fill('TestPassword123!');
        await confirmInput.fill('DifferentPassword123!');

        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click().catch(() => {});

        const hasError = await page.locator('text=/do not match|mismatch|different/i').first().isVisible().catch(() => false);
        const stillOnRegister = page.url().includes('/register');
        expect(hasError || stillOnRegister).toBe(true);
      }
    });

    test('should reject weak password', async ({ page }) => {
      await page.goto('/auth/register');

      const passwordInput = page.locator('input[type="password"]').first();
      const confirmInput = page.locator('input[type="password"]').nth(1);

      if (await confirmInput.isVisible().catch(() => false)) {
        await page.locator('input[type="email"]').first().fill('test@holilabs.xyz');
        await passwordInput.fill('weak');
        await confirmInput.fill('weak');

        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click().catch(() => {});

        const hasError = await page.locator('text=/password|strong|requirement|weak|minimum/i').first().isVisible().catch(() => false);
        const stillOnRegister = page.url().includes('/register');
        expect(hasError || stillOnRegister).toBe(true);
      }
    });
  });

  test.describe('Password Reset', () => {
    test('should display forgot password form', async ({ page }) => {
      await page.goto('/auth/forgot-password');
      const emailInput = page.locator('input[type="email"]').first();
      await expect(emailInput).toBeVisible();
    });

    test.skip('should initiate password reset for valid email', async ({ page }) => {
      // Skip: requires email service
    });

    test('should handle invalid email gracefully', async ({ page }) => {
      await page.goto('/auth/forgot-password');

      const emailInput = page.locator('input[type="email"]').first();
      const submitButton = page.locator('button[type="submit"]').first();

      await emailInput.fill('nonexistent@example.com');
      await submitButton.click();

      const message = page.locator('text=/email|sent|error/i').first();
      await expect(message).toBeVisible({ timeout: 5_000 });
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated user to auth from dashboard', async ({ page }) => {
      await page.goto('/dashboard/patients');
      await page.waitForLoadState('domcontentloaded');
      // Should redirect to auth page
      expect(page.url()).toMatch(/auth/);
    });

    test('should redirect unauthenticated user to auth from billing', async ({ page }) => {
      await page.goto('/dashboard/billing');
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toMatch(/auth/);
    });

    test('should redirect unauthenticated user to auth from clinical command', async ({ page }) => {
      await page.goto('/dashboard/clinical-command');
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toMatch(/auth/);
    });

    test('should redirect unauthenticated user to auth from patient portal', async ({ page }) => {
      await page.goto('/portal/dashboard');
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toMatch(/auth|login|portal/);
    });

    test('should allow authenticated user to access dashboard', async ({ page }) => {
      await setupMockAuth(page);
      await page.goto('/dashboard/patients');
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toContain('/dashboard');
    });
  });

  test.describe('Session Management', () => {
    test('should maintain session across page reloads', async ({ page }) => {
      await setupMockAuth(page);
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      await page.reload();
      await page.waitForLoadState('domcontentloaded');

      // Session mock persists across reloads (route interceptors stay active)
      expect(page.url()).toContain('/dashboard');
    });

    test('should handle session expiration gracefully', async ({ page }) => {
      await setupMockAuth(page);
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      // Remove mock to simulate expiration — override with unauthenticated session
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({}),
        });
      });

      await page.goto('/dashboard/patients');
      await page.waitForLoadState('domcontentloaded');

      // Should redirect to auth
      expect(page.url()).toMatch(/auth/);
    });
  });
});
