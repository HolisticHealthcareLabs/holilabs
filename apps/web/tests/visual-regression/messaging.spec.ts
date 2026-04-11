import { test, expect } from '@playwright/test';
import {
  THEMES,
  viewportFromProject,
  snapshotName,
  applyTheme,
  waitForStable,
} from './helpers';
import { setupMockAuth } from '../e2e/helpers/auth';

const PAGE_NAME = 'messaging';
const PAGE_URL = '/dashboard/comunicacoes';

for (const theme of THEMES) {
  test.describe(`Messaging / Comunicacoes — ${theme} mode`, () => {
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
        { fullPage: false, maxDiffPixelRatio: 0.001 },
      );
    });

    test(`conversation list renders correctly in ${theme} mode`, async ({
      page,
    }, testInfo) => {
      const viewport = viewportFromProject(testInfo);

      await setupMockAuth(page);
      await applyTheme(page, theme);
      await page.goto(PAGE_URL);
      await waitForStable(page);

      const list = page.locator(
        '[data-testid="message-list"], [data-testid="conversation-list"]',
      ).first();
      if (await list.isVisible()) {
        await expect(list).toHaveScreenshot(
          snapshotName(`${PAGE_NAME}-list`, viewport, theme),
          { maxDiffPixelRatio: 0.001 },
        );
      }
    });

    test(`compose area renders correctly in ${theme} mode`, async ({
      page,
    }, testInfo) => {
      const viewport = viewportFromProject(testInfo);

      await setupMockAuth(page);
      await applyTheme(page, theme);
      await page.goto(PAGE_URL);
      await waitForStable(page);

      const compose = page.locator(
        '[data-testid="compose-message"], [data-testid="message-input"]',
      ).first();
      if (await compose.isVisible()) {
        await expect(compose).toHaveScreenshot(
          snapshotName(`${PAGE_NAME}-compose`, viewport, theme),
          { maxDiffPixelRatio: 0.001 },
        );
      }
    });
  });
}
