import { test, expect } from '@playwright/test';
import {
  THEMES,
  viewportFromProject,
  snapshotName,
  applyTheme,
  waitForStable,
} from './helpers';

const PAGE_NAME = 'consent-dashboard';
const PAGE_URL = '/portal/dashboard/privacy';

for (const theme of THEMES) {
  test.describe(`Consent Dashboard — ${theme} mode`, () => {
    test(`should match visual baseline at current viewport in ${theme} mode`, async ({
      page,
    }, testInfo) => {
      const viewport = viewportFromProject(testInfo);

      await applyTheme(page, theme);
      await page.goto(PAGE_URL);
      await waitForStable(page);

      await expect(page).toHaveScreenshot(
        snapshotName(PAGE_NAME, viewport, theme),
        { fullPage: false, maxDiffPixelRatio: 0.001 },
      );
    });

    test(`consent toggles render correctly in ${theme} mode`, async ({
      page,
    }, testInfo) => {
      const viewport = viewportFromProject(testInfo);

      await applyTheme(page, theme);
      await page.goto(PAGE_URL);
      await waitForStable(page);

      const toggle = page.locator('[data-testid="consent-toggle"]').first();
      if (await toggle.isVisible()) {
        await expect(toggle).toHaveScreenshot(
          snapshotName(`${PAGE_NAME}-toggle`, viewport, theme),
          { maxDiffPixelRatio: 0.001 },
        );
      }
    });

    test(`audit trail section renders in ${theme} mode`, async ({
      page,
    }, testInfo) => {
      const viewport = viewportFromProject(testInfo);

      await applyTheme(page, theme);
      await page.goto(PAGE_URL);
      await waitForStable(page);

      const auditSection = page.locator(
        '[data-testid="audit-trail"], [data-testid="consent-history"]',
      ).first();
      if (await auditSection.isVisible()) {
        await expect(auditSection).toHaveScreenshot(
          snapshotName(`${PAGE_NAME}-audit`, viewport, theme),
          { maxDiffPixelRatio: 0.001 },
        );
      }
    });
  });
}
