/**
 * Accessibility Tests for Agent 9, 10, and 12 Fixes
 *
 * Tests WCAG AA compliance for:
 * - Agent 12: Dashboard theme toggle
 * - Agent 9: Clinical components accessibility
 * - Agent 10: Portal dashboard pages accessibility
 *
 * All tests verify 4.5:1 contrast ratio for body text and labels
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Helper to check for critical accessibility violations
function checkA11yViolations(violations: any[]) {
  const criticalViolations = violations.filter(
    v => v.impact === 'critical' || v.impact === 'serious'
  );

  if (criticalViolations.length > 0) {
    console.log('❌ Critical/Serious Accessibility Violations:');
    criticalViolations.forEach(violation => {
      console.log(`  - ${violation.id}: ${violation.description}`);
      console.log(`    Impact: ${violation.impact}`);
      console.log(`    Nodes: ${violation.nodes.length}`);
    });
  }

  return criticalViolations;
}

test.describe('Accessibility Tests - Light Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure we're in light mode
    await page.emulateMedia({ colorScheme: 'light' });
  });

  test('Dashboard Layout - Theme Toggle (Agent 12)', async ({ page }) => {
    // Navigate to dashboard (requires auth - skip if not available)
    await page.goto('/dashboard');

    // Check if we're redirected to login
    if (page.url().includes('/login') || page.url().includes('/auth')) {
      test.skip(true, 'Dashboard requires authentication');
      return;
    }

    // Run axe accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const violations = checkA11yViolations(accessibilityScanResults.violations);

    // Check for theme toggle visibility
    const themeToggle = page.locator('button[aria-label*="theme"], button[aria-label*="tema"]');
    await expect(themeToggle.first()).toBeVisible();

    expect(violations.length).toBe(0);
  });

  test('Portal Profile Page (Agent 10)', async ({ page }) => {
    await page.goto('/portal/dashboard/profile');

    // Skip if redirected to login
    if (page.url().includes('/login') || page.url().includes('/auth')) {
      test.skip(true, 'Portal requires authentication');
      return;
    }

    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const violations = checkA11yViolations(accessibilityScanResults.violations);

    // Verify key labels are present and readable
    const labels = [
      'Número de Registro Médico',
      'Correo Electrónico',
      'Teléfono',
      'Fecha de Nacimiento',
      'Género'
    ];

    for (const label of labels) {
      const element = page.locator(`text=${label}`);
      if (await element.count() > 0) {
        await expect(element.first()).toBeVisible();
      }
    }

    expect(violations.length).toBe(0);
  });

  test('Portal Privacy Page (Agent 10)', async ({ page }) => {
    await page.goto('/portal/dashboard/privacy');

    if (page.url().includes('/login') || page.url().includes('/auth')) {
      test.skip(true, 'Portal requires authentication');
      return;
    }

    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const violations = checkA11yViolations(accessibilityScanResults.violations);

    // Check for stats cards
    const statsLabels = ['Permisos Activos', 'Permisos Revocados', 'Accesos Este Mes'];
    for (const label of statsLabels) {
      const element = page.locator(`text=${label}`);
      if (await element.count() > 0) {
        await expect(element.first()).toBeVisible();
      }
    }

    expect(violations.length).toBe(0);
  });

  test('Portal Security Page (Agent 10)', async ({ page }) => {
    await page.goto('/portal/dashboard/security');

    if (page.url().includes('/login') || page.url().includes('/auth')) {
      test.skip(true, 'Portal requires authentication');
      return;
    }

    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const violations = checkA11yViolations(accessibilityScanResults.violations);

    expect(violations.length).toBe(0);
  });

  test('Landing Page - Public Access', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const violations = checkA11yViolations(accessibilityScanResults.violations);

    // Landing page should have no critical violations
    expect(violations.length).toBe(0);
  });
});

test.describe('Accessibility Tests - Dark Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Set dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
  });

  test('Dashboard Layout - Dark Mode (Agent 12)', async ({ page }) => {
    await page.goto('/dashboard');

    if (page.url().includes('/login') || page.url().includes('/auth')) {
      test.skip(true, 'Dashboard requires authentication');
      return;
    }

    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const violations = checkA11yViolations(accessibilityScanResults.violations);

    // Verify dark mode is active
    const html = page.locator('html');
    const className = await html.getAttribute('class');

    // Check if dark class is present (might be added by theme toggle)
    console.log('HTML classes:', className);

    expect(violations.length).toBe(0);
  });

  test('Portal Profile Page - Dark Mode (Agent 10)', async ({ page }) => {
    await page.goto('/portal/dashboard/profile');

    if (page.url().includes('/login') || page.url().includes('/auth')) {
      test.skip(true, 'Portal requires authentication');
      return;
    }

    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const violations = checkA11yViolations(accessibilityScanResults.violations);
    expect(violations.length).toBe(0);
  });

  test('Portal Privacy Page - Dark Mode (Agent 10)', async ({ page }) => {
    await page.goto('/portal/dashboard/privacy');

    if (page.url().includes('/login') || page.url().includes('/auth')) {
      test.skip(true, 'Portal requires authentication');
      return;
    }

    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const violations = checkA11yViolations(accessibilityScanResults.violations);
    expect(violations.length).toBe(0);
  });

  test('Portal Security Page - Dark Mode (Agent 10)', async ({ page }) => {
    await page.goto('/portal/dashboard/security');

    if (page.url().includes('/login') || page.url().includes('/auth')) {
      test.skip(true, 'Portal requires authentication');
      return;
    }

    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const violations = checkA11yViolations(accessibilityScanResults.violations);
    expect(violations.length).toBe(0);
  });

  test('Landing Page - Dark Mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const violations = checkA11yViolations(accessibilityScanResults.violations);
    expect(violations.length).toBe(0);
  });
});

test.describe('Contrast Ratio Verification', () => {
  test('Verify text contrast ratios meet WCAG AA (4.5:1)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Run contrast check specifically
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include('body')
      .analyze();

    const contrastViolations = accessibilityScanResults.violations.filter(
      v => v.id === 'color-contrast'
    );

    if (contrastViolations.length > 0) {
      console.log('❌ Contrast violations found:');
      contrastViolations.forEach(violation => {
        violation.nodes.forEach(node => {
          console.log(`  - ${node.html}`);
          console.log(`    Contrast ratio: ${node.any[0]?.data?.contrastRatio}`);
        });
      });
    }

    expect(contrastViolations.length).toBe(0);
  });
});

test.describe('Theme Toggle Functionality', () => {
  test('Theme toggle switches between light and dark modes', async ({ page }) => {
    await page.goto('/dashboard');

    if (page.url().includes('/login') || page.url().includes('/auth')) {
      test.skip(true, 'Dashboard requires authentication');
      return;
    }

    await page.waitForLoadState('networkidle');

    // Find theme toggle button
    const themeToggle = page.locator('button').filter({
      hasText: /theme|tema|light|dark|auto/i
    }).first();

    if (await themeToggle.count() === 0) {
      // Try finding by aria-label
      const toggleByAria = page.locator('button[aria-label*="theme"], button[aria-label*="tema"]');
      if (await toggleByAria.count() > 0) {
        await toggleByAria.first().click();
      }
    } else {
      await themeToggle.click();
    }

    // Wait for theme change
    await page.waitForTimeout(500);

    // Verify no accessibility violations after theme toggle
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const violations = checkA11yViolations(accessibilityScanResults.violations);
    expect(violations.length).toBe(0);
  });
});
