import { test, expect } from '@playwright/test';
import {
  THEMES,
  viewportFromProject,
  snapshotName,
  applyTheme,
  waitForStable,
} from './helpers';

const PAGE_NAME = 'patient-portal';
const PAGE_URL = '/portal/dashboard';

for (const theme of THEMES) {
  test.describe(`Patient Portal Dashboard — ${theme} mode`, () => {
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

    test(`appointment cards render correctly in ${theme} mode`, async ({
      page,
    }, testInfo) => {
      const viewport = viewportFromProject(testInfo);

      await applyTheme(page, theme);
      await page.goto(PAGE_URL);
      await waitForStable(page);

      const cards = page.locator('[data-testid="appointment-card"]').first();
      if (await cards.isVisible()) {
        await expect(cards).toHaveScreenshot(
          snapshotName(`${PAGE_NAME}-appointment`, viewport, theme),
          { maxDiffPixelRatio: 0.001 },
        );
      }
    });
  });
}
