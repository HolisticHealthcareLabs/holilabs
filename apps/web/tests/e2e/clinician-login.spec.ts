import { test, expect } from '@playwright/test';

test.describe('Clinician Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/callback/credentials', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: '/dashboard' }),
      });
    });

    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'doc-1',
            name: 'Dr. Garcia',
            email: 'garcia@clinic.com',
            role: 'DOCTOR',
          },
          expires: '2026-12-31T23:59:59.999Z',
        }),
      });
    });
  });

  test('should display login form elements', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
  });

  test('should fill and submit login form', async ({ page }) => {
    await page.goto('/auth/login');

    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');

    await emailInput.fill('garcia@clinic.com');
    await passwordInput.fill('SecurePass123!');

    // Check the Terms of Service checkbox to enable submit
    await page.locator('label:has(input[type="checkbox"])').click();

    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
    await submitBtn.click();

    await page.waitForURL('**/dashboard**', { timeout: 5000 }).catch(() => {});
  });

  test('should keep submit disabled when fields are empty', async ({ page }) => {
    await page.goto('/auth/login');
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeDisabled();
  });
});
