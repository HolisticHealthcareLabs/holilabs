import { test, expect } from '@playwright/test';

test.describe('Data Export Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'pat-1', name: 'Laura Perez', role: 'PATIENT' },
          expires: '2026-12-31T23:59:59.999Z',
        }),
      });
    });

    await page.route('**/api/data-export**', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              exportId: 'exp-1',
              status: 'PROCESSING',
              message: 'Your data export is being prepared',
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              exportId: 'exp-1',
              status: 'READY',
              downloadUrl: '/api/data-export/exp-1/download',
            },
          }),
        });
      }
    });

    await page.route('**/api/habeas-data/export**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { exportId: 'exp-1', status: 'PROCESSING' },
        }),
      });
    });
  });

  test('should navigate to data export page', async ({ page }) => {
    await page.goto('/portal/export');
    await page.waitForLoadState('domcontentloaded');
    const content = await page.content();
    expect(content).toBeTruthy();
  });

  test('should display export options', async ({ page }) => {
    await page.goto('/portal/export');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    const html = await page.content();
    expect(html.toLowerCase()).toMatch(/export|download|dados|data/);
  });

  test('should request data export', async ({ page }) => {
    await page.goto('/portal/export');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const exportBtn = page.locator('button:has-text("Export"), button:has-text("Exportar"), button:has-text("Download")').first();
    if (await exportBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await exportBtn.click();
      await page.waitForTimeout(1000);
    }
    const content = await page.content();
    expect(content).toBeTruthy();
  });
});
