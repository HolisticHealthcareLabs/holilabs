import { test, expect } from '@playwright/test';
import {
  THEMES,
  viewportFromProject,
  snapshotName,
  applyTheme,
  waitForStable,
} from './helpers';

const PAGE_NAME = 'clinical-command';
const PAGE_URL = '/dashboard/clinical-command';

for (const theme of THEMES) {
  test.describe(`Clinical Command Center — ${theme} mode`, () => {
    test(`should match visual baseline at current viewport in ${theme} mode`, async ({
      page,
    }, testInfo) => {
      const viewport = viewportFromProject(testInfo);

      await applyTheme(page, theme);
      await page.goto(PAGE_URL);
      await waitForStable(page);

      // Full-page screenshot — this is the most critical page
      await expect(page).toHaveScreenshot(
        snapshotName(PAGE_NAME, viewport, theme),
        { fullPage: true, maxDiffPixelRatio: 0.001 },
      );
    });

    test(`Co-Pilot panel renders correctly in ${theme} mode`, async ({
      page,
    }, testInfo) => {
      const viewport = viewportFromProject(testInfo);

      await applyTheme(page, theme);
      await page.goto(PAGE_URL);
      await waitForStable(page);

      const copilotPanel = page.locator(
        '[data-testid="copilot-panel"], [data-testid="co-pilot-panel"]',
      ).first();
      if (await copilotPanel.isVisible()) {
        await expect(copilotPanel).toHaveScreenshot(
          snapshotName(`${PAGE_NAME}-copilot`, viewport, theme),
          { maxDiffPixelRatio: 0.001 },
        );
      }
    });

    test(`SOAP editor area renders correctly in ${theme} mode`, async ({
      page,
    }, testInfo) => {
      const viewport = viewportFromProject(testInfo);

      await applyTheme(page, theme);
      await page.goto(PAGE_URL);
      await waitForStable(page);

      const soapForm = page.locator('[data-testid="soap-form"], [data-testid="soap-editor"]').first();
      if (await soapForm.isVisible()) {
        await expect(soapForm).toHaveScreenshot(
          snapshotName(`${PAGE_NAME}-soap`, viewport, theme),
          { maxDiffPixelRatio: 0.001 },
        );
      }
    });
  });
}
