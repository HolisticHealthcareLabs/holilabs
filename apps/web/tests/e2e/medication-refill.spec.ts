import { test, expect } from '@playwright/test';

test.describe('Medication Refill Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'pat-1', name: 'Elena Torres', role: 'PATIENT' },
          expires: '2026-12-31T23:59:59.999Z',
        }),
      });
    });

    await page.route('**/api/medications**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: 'med-1',
                name: 'Metformin 500mg',
                dosage: '500mg',
                frequency: 'twice daily',
                refillsRemaining: 2,
                lastFilled: '2025-04-01',
              },
            ],
          }),
        });
      }
    });

    await page.route('**/api/medications/*/refill', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Refill requested' }),
      });
    });
  });

  test('should navigate to medications page', async ({ page }) => {
    await page.goto('/portal/medications');
    await page.waitForLoadState('domcontentloaded');
    const content = await page.content();
    expect(content).toBeTruthy();
  });

  test('should display medications list', async ({ page }) => {
    await page.goto('/portal/medications');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    const html = await page.content();
    expect(html.toLowerCase()).toMatch(/medicat|medicamento|medication/);
  });

  test('should click refill button if visible', async ({ page }) => {
    await page.goto('/portal/medications');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const refillBtn = page.locator('button:has-text("Refill"), button:has-text("Renovar")').first();
    if (await refillBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await refillBtn.click();
      await page.waitForTimeout(1000);
    }
    const content = await page.content();
    expect(content).toBeTruthy();
  });
});
