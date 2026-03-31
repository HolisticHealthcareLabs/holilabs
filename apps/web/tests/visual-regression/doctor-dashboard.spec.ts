import { test, expect } from '@playwright/test';
import {
  THEMES,
  type Theme,
  viewportFromProject,
  snapshotName,
  applyTheme,
  waitForStable,
} from './helpers';

const PAGE_NAME = 'doctor-dashboard';
const PAGE_URL = '/dashboard';

for (const theme of THEMES) {
  test.describe(`Doctor Dashboard — ${theme} mode`, () => {
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

    test(`sidebar navigation renders correctly in ${theme} mode`, async ({
      page,
    }, testInfo) => {
      const viewport = viewportFromProject(testInfo);

      await applyTheme(page, theme);
      await page.goto(PAGE_URL);
      await waitForStable(page);

      const sidebar = page.locator('aside, nav[data-sidebar], [data-testid="sidebar"]').first();
      if (await sidebar.isVisible()) {
        await expect(sidebar).toHaveScreenshot(
          snapshotName(`${PAGE_NAME}-sidebar`, viewport, theme),
          { maxDiffPixelRatio: 0.001 },
        );
      }
    });
  });
}
