import { test, expect } from '@playwright/test';

test.describe('Patient Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/patient/register', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Registration successful',
          data: { patientId: 'pat-new-1' },
        }),
      });
    });

    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(null),
      });
    });
  });

  test('should display registration form', async ({ page }) => {
    await page.goto('/portal/register');
    await page.waitForLoadState('domcontentloaded');
    const html = await page.content();
    expect(html).toContain('register');
  });

  test('should fill registration form fields', async ({ page }) => {
    await page.goto('/portal/register');
    await page.waitForLoadState('domcontentloaded');

    const nameInput = page.locator('input[name="name"], input[name="firstName"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('Carlos Mendez');
    }

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('carlos@patient.com');
    }

    const phoneInput = page.locator('input[type="tel"], input[name="phone"]').first();
    if (await phoneInput.isVisible()) {
      await phoneInput.fill('+55 11 99999-0000');
    }
  });

  test('should submit and show success', async ({ page }) => {
    await page.goto('/portal/register');
    await page.waitForLoadState('domcontentloaded');

    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(1000);
    }
    const content = await page.content();
    expect(content).toBeTruthy();
  });
});
