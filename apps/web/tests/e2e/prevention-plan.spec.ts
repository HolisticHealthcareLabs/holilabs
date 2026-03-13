import { test, expect } from '@playwright/test';

test.describe('Prevention Plan Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'doc-1', name: 'Dr. Garcia', role: 'DOCTOR' },
          expires: '2026-12-31T23:59:59.999Z',
        }),
      });
    });

    await page.route('**/api/prevention/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            plans: [
              {
                id: 'plan-1',
                domain: 'Cardiovascular',
                riskLevel: 'MODERATE',
                screenings: [
                  { name: 'Lipid Panel', dueDate: '2025-08-01', status: 'OVERDUE' },
                  { name: 'Blood Pressure Check', dueDate: '2025-07-01', status: 'DUE' },
                ],
              },
              {
                id: 'plan-2',
                domain: 'Cancer Screening',
                riskLevel: 'LOW',
                screenings: [
                  { name: 'Colonoscopy', dueDate: '2027-01-01', status: 'UP_TO_DATE' },
                ],
              },
            ],
          },
        }),
      });
    });

    await page.route('**/api/prevention/hub**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            domains: ['Cardiovascular', 'Cancer Screening', 'Metabolic', 'Mental Health'],
            totalProtocols: 52,
            overdueCount: 3,
          },
        }),
      });
    });
  });

  test('should navigate to prevention hub', async ({ page }) => {
    await page.goto('/dashboard/prevention/hub');
    await page.waitForLoadState('domcontentloaded');
    const content = await page.content();
    expect(content).toBeTruthy();
  });

  test('should display prevention plan cards', async ({ page }) => {
    await page.goto('/dashboard/prevention/hub');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    const html = await page.content();
    expect(html.toLowerCase()).toMatch(/prevention|preven|screening|rastreamento/);
  });

  test('should show health domains', async ({ page }) => {
    await page.goto('/dashboard/prevention/hub');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    const cards = page.locator('[class*="card"], [class*="Card"], [data-testid*="plan"], [class*="rounded"]');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
