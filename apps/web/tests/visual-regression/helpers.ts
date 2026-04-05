import { type Page, type TestInfo } from '@playwright/test';

/**
 * Shared helpers for visual regression tests.
 *
 * Golden images stored at:
 *   apps/web/playwright/__screenshots__/{page}/{viewport}/{theme}.png
 */

export const THEMES = ['light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

/** Derive viewport name from the Playwright project name (vr-mobile → mobile) */
export function viewportFromProject(testInfo: TestInfo): string {
  return testInfo.project.name.replace('vr-', '');
}

/**
 * Build a deterministic snapshot name so golden images land in a stable path.
 * Format: {pageName}/{viewport}/{theme}.png
 */
export function snapshotName(
  pageName: string,
  viewport: string,
  theme: Theme,
): string {
  return `${pageName}/${viewport}/${theme}.png`;
}

/** Apply a color scheme to the page via the <html> class attribute. */
export async function applyTheme(page: Page, theme: Theme): Promise<void> {
  await page.emulateMedia({ colorScheme: theme });
  // Also toggle the Tailwind `dark` class for apps that rely on className
  await page.evaluate((t) => {
    document.documentElement.classList.toggle('dark', t === 'dark');
  }, theme);
}

/** Wait for network idle + animation settle before screenshotting. */
export async function waitForStable(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  // Let CSS transitions / skeleton loaders settle
  await page.waitForTimeout(500);
}
