import { test, expect } from '@playwright/test';
import {
  THEMES,
  viewportFromProject,
  snapshotName,
  applyTheme,
  waitForStable,
} from './helpers';

const PAGE_NAME = 'notifications';
const PAGE_URL = '/dashboard';

for (const theme of THEMES) {
  test.describe(`Notification Bell + Panel — ${theme} mode`, () => {
    test(`notification bell icon should match baseline in ${theme} mode`, async ({
      page,
    }, testInfo) => {
      const viewport = viewportFromProject(testInfo);

      await applyTheme(page, theme);
      await page.goto(PAGE_URL);
      await waitForStable(page);

      const bell = page.locator(
        '[data-testid="notification-bell"], [aria-label*="notification" i]',
      ).first();
      if (await bell.isVisible()) {
        await expect(bell).toHaveScreenshot(
          snapshotName(`${PAGE_NAME}-bell`, viewport, theme),
          { maxDiffPixelRatio: 0.001 },
        );
      }
    });

    test(`notification panel open state should match baseline in ${theme} mode`, async ({
      page,
    }, testInfo) => {
      const viewport = viewportFromProject(testInfo);

      await applyTheme(page, theme);
      await page.goto(PAGE_URL);
      await waitForStable(page);

      // Open notification panel
      const bell = page.locator(
        '[data-testid="notification-bell"], [aria-label*="notification" i]',
      ).first();
      if (await bell.isVisible()) {
        await bell.click();
        await page.waitForTimeout(300);

        const panel = page.locator(
          '[data-testid="notification-panel"], [data-testid="notification-dropdown"]',
        ).first();
        if (await panel.isVisible()) {
          await expect(panel).toHaveScreenshot(
            snapshotName(`${PAGE_NAME}-panel`, viewport, theme),
            { maxDiffPixelRatio: 0.001 },
          );
        }
      }
    });
  });
}
