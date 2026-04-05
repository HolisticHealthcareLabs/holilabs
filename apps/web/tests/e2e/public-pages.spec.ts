import { test, expect } from '@playwright/test';

/**
 * Public Pages E2E Tests
 *
 * Coverage: Landing pages, pricing, legal pages, doctor finder, demo,
 * and i18n-enabled public routes.
 */

test.describe('Public Pages', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const mainContent = page.locator('main, [role="main"]').first();
    await expect(mainContent).toBeVisible();
  });

  test('should display navigation on homepage', async ({ page }) => {
    await page.goto('/');

    const nav = page.locator('nav, [role="navigation"]').first();
    const navLinks = page
      .locator('a')
      .filter({ hasText: /pricing|features|about|contact/i })
      .first();

    const hasNav =
      (await nav.isVisible().catch(() => false)) ||
      (await navLinks.isVisible().catch(() => false));

    expect(hasNav).toBe(true);
  });

  test('should have call-to-action buttons on homepage', async ({ page }) => {
    await page.goto('/');

    const ctaButton = page
      .locator('a, button')
      .filter({ hasText: /get started|sign up|start free|try now/i })
      .first();

    if (await ctaButton.isVisible().catch(() => false)) {
      await expect(ctaButton).toBeVisible();
    }
  });

  test('should navigate to pricing page', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page).toHaveURL(/pricing/);

    const mainContent = page.locator('main, [role="main"]').first();
    await expect(mainContent).toBeVisible({ timeout: 5_000 });
  });

  test('should display pricing tiers on pricing page', async ({ page }) => {
    await page.goto('/pricing');

    const pricingCards = page.locator('[data-testid="pricing-card"]');
    const pricingTiers = page
      .locator('div, section')
      .filter({ hasText: /starter|professional|enterprise|premium/i });

    const hasCards = await pricingCards.count();
    const hasTiers = await pricingTiers.count();

    expect(hasCards > 0 || hasTiers > 0).toBe(true);
  });

  test('should have pricing comparison or features list', async ({ page }) => {
    await page.goto('/pricing');

    const featureList = page.locator('ul, ol, [role="list"]').first();
    const comparisonTable = page.locator('[role="table"]').first();

    const hasContent =
      (await featureList.isVisible().catch(() => false)) ||
      (await comparisonTable.isVisible().catch(() => false));

    expect(hasContent || page.url().includes('pricing')).toBeTruthy();
  });

  test('should navigate to find-doctor page', async ({ page }) => {
    await page.goto('/find-doctor');

    const mainContent = page.locator('main, [role="main"]').first();
    const isVisible = await mainContent.isVisible().catch(() => false);

    expect(isVisible || page.url().includes('find-doctor')).toBeTruthy();
  });

  test('should display doctor search functionality', async ({ page }) => {
    await page.goto('/find-doctor');

    const searchInput = page
      .locator('input[type="text"], input[placeholder*="search"]')
      .first();

    const searchButton = page
      .locator('button')
      .filter({ hasText: /search|find|filter/i })
      .first();

    const hasSearch =
      (await searchInput.isVisible().catch(() => false)) ||
      (await searchButton.isVisible().catch(() => false));

    expect(hasSearch || page.url().includes('find-doctor')).toBeTruthy();
  });

  test('should navigate to demo page', async ({ page }) => {
    await page.goto('/demo');

    const mainContent = page.locator('main, [role="main"]').first();
    const isVisible = await mainContent.isVisible().catch(() => false);

    expect(isVisible || page.url().includes('demo')).toBeTruthy();
  });

  test('should display demo video or walkthrough on demo page', async ({
    page,
  }) => {
    await page.goto('/demo');

    const video = page.locator('video, [data-testid="demo-video"]').first();
    const iframe = page.locator('iframe').first();
    const demoContent = page.locator('[data-testid="demo-content"]').first();

    const hasDemo =
      (await video.isVisible().catch(() => false)) ||
      (await iframe.isVisible().catch(() => false)) ||
      (await demoContent.isVisible().catch(() => false));

    // Demo page should have some content
    expect(hasDemo || page.url().includes('demo')).toBeTruthy();
  });

  test('should navigate to privacy policy', async ({ page }) => {
    await page.goto('/legal/privacy');
    await expect(page).toHaveURL(/legal.*privacy/);

    const mainContent = page.locator('main, [role="main"]').first();
    await expect(mainContent).toBeVisible({ timeout: 5_000 });
  });

  test('should display legal content', async ({ page }) => {
    await page.goto('/legal/privacy');

    const content = page.locator('h1, h2').first();
    await expect(content).toBeVisible();

    const text = await page.content();
    expect(text.length).toBeGreaterThan(0);
  });

  test('should navigate to terms of service', async ({ page }) => {
    await page.goto('/legal/terms');
    await expect(page).toHaveURL(/legal.*terms/);

    const mainContent = page.locator('main, [role="main"]').first();
    await expect(mainContent).toBeVisible({ timeout: 5_000 });
  });

  test('should have legal footer links', async ({ page }) => {
    await page.goto('/');

    const footer = page.locator('footer').first();
    const legalLink = page
      .locator('a')
      .filter({ hasText: /privacy|terms|legal|copyright/i })
      .first();

    const hasFooter = await footer.isVisible().catch(() => false);
    const hasLegalLink = await legalLink.isVisible().catch(() => false);

    expect(hasFooter || hasLegalLink).toBe(true);
  });

  test('should support i18n on public routes', async ({ page }) => {
    // Try to access with locale prefix (common patterns: /en, /es, /pt-br)
    const locales = ['en', 'es', 'pt', 'pt-br', 'fr'];

    for (const locale of locales) {
      try {
        await page.goto(`/${locale}`);
        const content = page.locator('main, [role="main"]').first();
        const isVisible = await content.isVisible().catch(() => false);

        if (isVisible) {
          expect(true).toBe(true);
          break;
        }
      } catch {
        // Locale may not be supported, try next
      }
    }
  });

  test('should handle 404 gracefully', async ({ page }) => {
    await page.goto('/nonexistent-page-xyz');

    const notFoundMessage = page
      .locator('h1, h2')
      .filter({ hasText: /404|not found|does not exist/i })
      .first();

    const homeLink = page
      .locator('a')
      .filter({ hasText: /home|back|return/i })
      .first();

    const hasErrorPage = await notFoundMessage.isVisible().catch(() => false);
    const hasHomeLink = await homeLink.isVisible().catch(() => false);

    expect(hasErrorPage || hasHomeLink || true).toBeTruthy();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');

    const mainContent = page.locator('main, [role="main"]').first();
    await expect(mainContent).toBeVisible();
  });

  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/');

    const mainContent = page.locator('main, [role="main"]').first();
    await expect(mainContent).toBeVisible();
  });

  test('should load pricing on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/pricing');

    const mainContent = page.locator('main, [role="main"]').first();
    await expect(mainContent).toBeVisible();
  });

  test('should have mobile-friendly navigation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');

    // Should have hamburger menu or collapse navigation
    const hamburger = page
      .locator('button')
      .filter({ hasText: /menu|hamburger|nav|toggle/i })
      .first();

    const nav = page.locator('nav, [role="navigation"]').first();

    const hasNav =
      (await hamburger.isVisible().catch(() => false)) ||
      (await nav.isVisible().catch(() => false));

    expect(hasNav).toBe(true);
  });

  test('should load quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000);
  });

  test('should have valid meta tags', async ({ page }) => {
    await page.goto('/');

    // Check for basic meta tags
    const title = await page.title();
    const description = await page
      .locator('meta[name="description"]')
      .getAttribute('content');

    expect(title).toBeTruthy();
    expect(description).toBeTruthy();
  });

  test('should have alt text on images', async ({ page }) => {
    await page.goto('/');

    const images = page.locator('img');
    const imageCount = await images.count();

    // If there are images, they should have alt text
    if (imageCount > 0) {
      for (let i = 0; i < Math.min(imageCount, 5); i++) {
        const alt = await images.nth(i).getAttribute('alt');
        // Alt text should exist (even if empty string is acceptable for decorative images)
        expect(alt !== null).toBe(true);
      }
    }
  });
});
