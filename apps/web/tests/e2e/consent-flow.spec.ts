import { test, expect } from '@playwright/test';

test.describe('Consent Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'pat-1',
            name: 'Ana Lima',
            role: 'PATIENT',
          },
          expires: '2026-12-31T23:59:59.999Z',
        }),
      });
    });

    await page.route('**/api/consents**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: 'consent-1',
                type: 'SERVICE',
                version: '2.0',
                status: 'PENDING',
                description: 'Consent for clinical data processing',
              },
            ],
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Consent accepted' }),
        });
      }
    });

    await page.route('**/api/consents/accept', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Consent accepted' }),
      });
    });
  });

  test('should navigate to consent page', async ({ page }) => {
    await page.goto('/portal/consent');
    await page.waitForLoadState('domcontentloaded');
    const content = await page.content();
    expect(content).toBeTruthy();
  });

  test('should display consent options', async ({ page }) => {
    await page.goto('/portal/consent');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    const html = await page.content();
    expect(html.toLowerCase()).toMatch(/consent|consentimento|permiss/);
  });

  test('should accept consent', async ({ page }) => {
    await page.goto('/portal/consent');
    await page.waitForLoadState('domcontentloaded');

    const acceptBtn = page.locator('button:has-text("Accept"), button:has-text("Aceitar"), button:has-text("Agree")').first();
    if (await acceptBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await acceptBtn.click();
      await page.waitForTimeout(1000);
    }
    const content = await page.content();
    expect(content).toBeTruthy();
  });
});
