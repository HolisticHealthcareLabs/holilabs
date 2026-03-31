import { test, expect } from '@playwright/test';
import {
  THEMES,
  viewportFromProject,
  snapshotName,
  applyTheme,
  waitForStable,
} from './helpers';

const PAGE_NAME = 'prescription-verify';
const PAGE_URL = '/verify/prescription/test-hash';

for (const theme of THEMES) {
  test.describe(`Prescription Verification (public) — ${theme} mode`, () => {
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

    test(`prescription details card renders in ${theme} mode`, async ({
      page,
    }, testInfo) => {
      const viewport = viewportFromProject(testInfo);

      await applyTheme(page, theme);
      await page.goto(PAGE_URL);
      await waitForStable(page);

      const card = page.locator(
        '[data-testid="prescription-details"], [data-testid="verification-card"]',
      ).first();
      if (await card.isVisible()) {
        await expect(card).toHaveScreenshot(
          snapshotName(`${PAGE_NAME}-card`, viewport, theme),
          { maxDiffPixelRatio: 0.001 },
        );
      }
    });
  });
}
