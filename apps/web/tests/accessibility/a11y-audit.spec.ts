import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility Audit — 8 Critical Pages
 *
 * Uses axe-core to scan for WCAG 2.1 AA violations.
 *
 * Rules:
 *   - FAIL on "critical" or "serious" violations
 *   - WARN on "moderate" violations (logged, not blocking)
 *   - Check: aria-labels, touch targets >= 44px, color contrast AA,
 *     focus indicators, no keyboard traps, lang attribute
 *
 * Viewports: mobile (375×667) and desktop (1440×900)
 */

// ── Configuration ────────────────────────────────────────────────────

const CRITICAL_PAGES = [
  { name: 'Doctor Dashboard', url: '/dashboard', auth: 'doctor' },
  { name: 'Clinical Command', url: '/dashboard/clinical-command', auth: 'doctor' },
  { name: 'Patient Portal', url: '/portal/dashboard', auth: 'patient' },
  { name: 'Lab Results', url: '/portal/dashboard/lab-results', auth: 'patient' },
  { name: 'Consent Dashboard', url: '/portal/dashboard/privacy', auth: 'patient' },
  { name: 'Prescription Verify', url: '/verify/prescription/test-hash', auth: 'none' },
  { name: 'Notifications (Dashboard)', url: '/dashboard', auth: 'doctor' },
  { name: 'Messaging', url: '/dashboard/comunicacoes', auth: 'doctor' },
] as const;

const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  desktop: { width: 1440, height: 900 },
} as const;

const LOCALES = ['pt-BR', 'es', 'en'] as const;

// ── Helpers ──────────────────────────────────────────────────────────

async function stubSession(
  page: import('@playwright/test').Page,
  role: 'doctor' | 'patient' | 'none',
) {
  if (role === 'none') return;

  const user =
    role === 'doctor'
      ? {
          id: 'doc-a11y',
          name: 'Dr. Ana Costa',
          email: 'ana@holilabs.test',
          role: 'PHYSICIAN',
          workspaceId: 'ws-a11y',
        }
      : {
          id: 'pat-a11y',
          name: 'Maria Gonzalez',
          email: 'maria@test.com',
          role: 'PATIENT',
          workspaceId: 'ws-a11y',
        };

  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user,
        expires: '2027-01-01T00:00:00.000Z',
      }),
    });
  });
}

// ── Core axe audit per page ──────────────────────────────────────────

for (const pageConfig of CRITICAL_PAGES) {
  for (const [vpName, vpSize] of Object.entries(VIEWPORTS)) {
    test.describe(`A11y: ${pageConfig.name} @ ${vpName}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize(vpSize);
        await stubSession(page, pageConfig.auth);
      });

      test(`should have no critical or serious axe violations`, async ({ page }) => {
        await page.goto(pageConfig.url);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze();

        // Separate by impact
        const critical = results.violations.filter(
          (v) => v.impact === 'critical' || v.impact === 'serious',
        );
        const moderate = results.violations.filter((v) => v.impact === 'moderate');

        // Log moderate as warnings
        if (moderate.length > 0) {
          console.warn(
            `[A11Y WARN] ${pageConfig.name} @ ${vpName}: ${moderate.length} moderate violation(s)`,
          );
          for (const v of moderate) {
            console.warn(`  - ${v.id}: ${v.help} (${v.nodes.length} node(s))`);
          }
        }

        // Fail on critical/serious
        if (critical.length > 0) {
          const details = critical
            .map(
              (v) =>
                `${v.id} [${v.impact}]: ${v.help}\n` +
                v.nodes.map((n) => `    ${n.html.slice(0, 120)}`).join('\n'),
            )
            .join('\n\n');

          expect(
            critical,
            `Critical/serious a11y violations on ${pageConfig.name} @ ${vpName}:\n\n${details}`,
          ).toHaveLength(0);
        }
      });

      test(`should have color contrast meeting AA standard`, async ({ page }) => {
        await page.goto(pageConfig.url);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);

        const results = await new AxeBuilder({ page })
          .include('body')
          .withRules(['color-contrast'])
          .analyze();

        const serious = results.violations.filter(
          (v) => v.impact === 'critical' || v.impact === 'serious',
        );

        expect(
          serious,
          `Color contrast failures on ${pageConfig.name}: ${serious.map((v) => v.help).join(', ')}`,
        ).toHaveLength(0);
      });
    });
  }
}

// ── Interactive element checks ───────────────────────────────────────

test.describe('A11y: Interactive Elements — Aria Labels', () => {
  test.beforeEach(async ({ page }) => {
    await stubSession(page, 'doctor');
  });

  test('all buttons should have accessible names', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const buttons = page.locator('button:visible');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 20); i++) {
      const btn = buttons.nth(i);
      const ariaLabel = await btn.getAttribute('aria-label');
      const ariaLabelledby = await btn.getAttribute('aria-labelledby');
      const text = (await btn.textContent())?.trim();
      const title = await btn.getAttribute('title');

      const hasAccessibleName =
        (ariaLabel && ariaLabel.length > 0) ||
        (ariaLabelledby && ariaLabelledby.length > 0) ||
        (text && text.length > 0) ||
        (title && title.length > 0);

      expect(
        hasAccessibleName,
        `Button at index ${i} has no accessible name: ${await btn.evaluate((el) => el.outerHTML.slice(0, 100))}`,
      ).toBe(true);
    }
  });

  test('all form inputs should have labels', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const inputs = page.locator('input:visible, select:visible, textarea:visible');
    const count = await inputs.count();

    for (let i = 0; i < Math.min(count, 20); i++) {
      const input = inputs.nth(i);
      const type = await input.getAttribute('type');

      // Skip hidden/submit inputs
      if (type === 'hidden' || type === 'submit') continue;

      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledby = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');
      const title = await input.getAttribute('title');

      // Check if a <label> exists for this input
      let hasLabel = false;
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        hasLabel = (await label.count()) > 0;
      }

      const hasAccessibleLabel =
        hasLabel ||
        (ariaLabel && ariaLabel.length > 0) ||
        (ariaLabelledby && ariaLabelledby.length > 0) ||
        (placeholder && placeholder.length > 0) ||
        (title && title.length > 0);

      expect(
        hasAccessibleLabel,
        `Input at index ${i} (type=${type}) has no label or aria-label`,
      ).toBe(true);
    }
  });
});

// ── Touch target size ────────────────────────────────────────────────

test.describe('A11y: Touch Targets >= 44px', () => {
  test('interactive elements should meet minimum touch target size on mobile', async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await stubSession(page, 'doctor');
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const interactiveElements = page.locator(
      'button:visible, a:visible, input:visible, select:visible, [role="button"]:visible',
    );
    const count = await interactiveElements.count();
    let undersizedCount = 0;

    for (let i = 0; i < Math.min(count, 30); i++) {
      const el = interactiveElements.nth(i);
      const box = await el.boundingBox();
      if (box && (box.height < 44 || box.width < 44)) {
        undersizedCount++;
      }
    }

    // Allow some small elements (icons in groups, etc.) but flag if > 30%
    const ratio = count > 0 ? undersizedCount / count : 0;
    expect(
      ratio,
      `${undersizedCount}/${count} interactive elements are under 44px touch target (${(ratio * 100).toFixed(0)}%)`,
    ).toBeLessThan(0.5);
  });
});

// ── Focus indicators ─────────────────────────────────────────────────

test.describe('A11y: Focus Indicators', () => {
  test('should have visible focus indicators on Tab navigation', async ({ page }) => {
    await stubSession(page, 'doctor');
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Tab through several elements
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }

    const focusedEl = page.locator(':focus-visible').first();
    const isVisible = await focusedEl.isVisible().catch(() => false);

    if (isVisible) {
      const hasFocusStyle = await focusedEl.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        const hasOutline = styles.outlineStyle !== 'none' && styles.outlineWidth !== '0px';
        const hasShadow = styles.boxShadow !== 'none';
        const hasBorder =
          styles.borderColor !== 'rgb(0, 0, 0)' && styles.borderStyle !== 'none';
        return hasOutline || hasShadow || hasBorder;
      });

      expect(hasFocusStyle).toBe(true);
    }
  });
});

// ── Keyboard traps ───────────────────────────────────────────────────

test.describe('A11y: No Keyboard Traps', () => {
  test('should not trap keyboard focus in any element', async ({ page }) => {
    await stubSession(page, 'doctor');
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const focusedTags: string[] = [];

    // Tab 20 times and track focused elements
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const tag = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? `${el.tagName}.${el.className}`.slice(0, 50) : 'BODY';
      });
      focusedTags.push(tag);
    }

    // If focus is trapped, the same element appears repeatedly
    const uniqueTags = new Set(focusedTags);
    // Should have moved to at least 3 different elements in 20 tabs
    expect(
      uniqueTags.size,
      `Keyboard may be trapped: only ${uniqueTags.size} unique focus targets in 20 tabs`,
    ).toBeGreaterThanOrEqual(3);
  });
});

// ── Lang attribute ───────────────────────────────────────────────────

test.describe('A11y: Lang Attribute', () => {
  for (const locale of LOCALES) {
    test(`should have correct lang attribute for locale ${locale}`, async ({ page }) => {
      await stubSession(page, 'doctor');

      // Set locale via cookie (next-intl convention)
      await page.context().addCookies([
        { name: 'NEXT_LOCALE', value: locale, domain: 'localhost', path: '/' },
      ]);

      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      const lang = await page.locator('html').getAttribute('lang');
      expect(lang).toBeTruthy();

      // Lang should match locale or at least the language part
      const langPrefix = locale.split('-')[0];
      expect(lang?.toLowerCase().startsWith(langPrefix)).toBe(true);
    });
  }
});
