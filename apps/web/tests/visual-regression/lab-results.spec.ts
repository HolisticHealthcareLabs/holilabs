import { test, expect } from '@playwright/test';
import {
  THEMES,
  viewportFromProject,
  snapshotName,
  applyTheme,
  waitForStable,
} from './helpers';
import { setupMockAuth } from '../e2e/helpers/auth';

const PAGE_NAME = 'lab-results';
const PAGE_URL = '/portal/dashboard/lab-results';

for (const theme of THEMES) {
  test.describe(`Lab Results — ${theme} mode`, () => {
    test(`should match visual baseline at current viewport in ${theme} mode`, async ({
      page,
    }, testInfo) => {
      const viewport = viewportFromProject(testInfo);

      await setupMockAuth(page);
      await applyTheme(page, theme);
      await page.goto(PAGE_URL);
      await waitForStable(page);

      await expect(page).toHaveScreenshot(
        snapshotName(PAGE_NAME, viewport, theme),
        { fullPage: true, maxDiffPixelRatio: 0.001 },
      );
    });

    test(`result table renders correctly in ${theme} mode`, async ({
      page,
    }, testInfo) => {
      const viewport = viewportFromProject(testInfo);

      await setupMockAuth(page);
      await applyTheme(page, theme);
      await page.goto(PAGE_URL);
      await waitForStable(page);

      const table = page.locator(
        '[data-testid="lab-result-list"], [data-testid="lab-results-table"], table',
      ).first();
      if (await table.isVisible()) {
        await expect(table).toHaveScreenshot(
          snapshotName(`${PAGE_NAME}-table`, viewport, theme),
          { maxDiffPixelRatio: 0.001 },
        );
      }
    });

    test(`biomarker range indicators render in ${theme} mode`, async ({
      page,
    }, testInfo) => {
      const viewport = viewportFromProject(testInfo);

      await setupMockAuth(page);
      await applyTheme(page, theme);
      await page.goto(PAGE_URL);
      await waitForStable(page);

      const rangeIndicator = page.locator('[data-testid="range-indicator"]').first();
      if (await rangeIndicator.isVisible()) {
        await expect(rangeIndicator).toHaveScreenshot(
          snapshotName(`${PAGE_NAME}-range`, viewport, theme),
          { maxDiffPixelRatio: 0.001 },
        );
      }
    });
  });
}
