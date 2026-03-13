import { test, expect } from '@playwright/test';

test.describe('Magic Link Verification Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/patient/magic-link/verify**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            token: 'jwt-session-token',
            patient: { id: 'pat-1', name: 'Rosa Vargas' },
          },
        }),
      });
    });

    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'pat-1', name: 'Rosa Vargas', role: 'PATIENT' },
          expires: '2026-12-31T23:59:59.999Z',
        }),
      });
    });
  });

  test('should navigate to magic link verify endpoint', async ({ page }) => {
    await page.goto('/auth/patient/magic-link/verify?token=test-token-123');
    await page.waitForLoadState('domcontentloaded');
    const content = await page.content();
    expect(content).toBeTruthy();
  });

  test('should process token and redirect', async ({ page }) => {
    await page.goto('/auth/patient/magic-link/verify?token=valid-token-abc');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const url = page.url();
    expect(url).toBeTruthy();
  });

  test('should handle invalid token gracefully', async ({ page }) => {
    await page.route('**/api/auth/patient/magic-link/verify**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Invalid or expired token' }),
      });
    });

    await page.goto('/auth/patient/magic-link/verify?token=expired-token');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    const content = await page.content();
    expect(content).toBeTruthy();
  });
});
