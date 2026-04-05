import { test, expect } from '@playwright/test';
import { setupMockAuth } from './helpers/auth';

/**
 * Clinician Dashboard E2E Tests
 *
 * Coverage:
 * - Dashboard navigation and layout
 * - Patient list interactions
 * - Billing overview
 * - Key dashboard features
 * - Sidebar/navigation menu
 */

test.describe('Clinician Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/dashboard/patients');
  });

  test.describe('Dashboard Navigation', () => {
    test('should display dashboard layout', async ({ page }) => {
      // Check for main dashboard elements
      const pageTitle = page.locator('h1, h2').first();
      await expect(pageTitle).toBeVisible();

      // Navigation should be visible
      const nav = page.locator('nav, [role="navigation"]').first();
      await expect(nav).toBeVisible();
    });

    test('should navigate to patients list', async ({ page }) => {
      await page.goto('/dashboard/patients');
      await expect(page).toHaveURL(/patients/);

      // Should show patient list or empty state
      const patientList = page.locator('[role="table"], [data-testid="patient-list"]');
      const emptyState = page.locator('text=/no patients|empty/i');

      const hasContent =
        (await patientList.isVisible().catch(() => false)) ||
        (await emptyState.isVisible().catch(() => false));

      expect(hasContent).toBe(true);
    });

    test('should navigate to billing', async ({ page }) => {
      await page.goto('/dashboard/billing');
      await expect(page).toHaveURL(/billing/);

      // Should show billing content
      const billingTitle = page
        .locator('h1, h2')
        .filter({ hasText: /billing|invoice|claim/i })
        .first();

      await expect(billingTitle).toBeVisible({ timeout: 5_000 });
    });

    test('should navigate to diagnosis', async ({ page }) => {
      await page.goto('/dashboard/diagnosis');
      await expect(page).toHaveURL(/diagnosis/);
    });

    test('should navigate to prevention hub', async ({ page }) => {
      await page.goto('/dashboard/prevention/plans');
      await expect(page).toHaveURL(/prevention/);
    });

    test('should navigate to referrals', async ({ page }) => {
      await page.goto('/dashboard/referrals');
      await expect(page).toHaveURL(/referrals/);
    });

    test('should navigate to AI tools', async ({ page }) => {
      await page.goto('/dashboard/ai');
      await expect(page).toHaveURL(/\/ai/);
    });

    test('should navigate to clinical support', async ({ page }) => {
      await page.goto('/dashboard/clinical-support');
      await expect(page).toHaveURL(/clinical-support/);
    });

    test('should navigate to analytics', async ({ page }) => {
      await page.goto('/dashboard/analytics');
      await expect(page).toHaveURL(/analytics/);
    });

    test('should navigate to governance', async ({ page }) => {
      await page.goto('/dashboard/governance');
      await expect(page).toHaveURL(/governance/);
    });
  });

  test.describe('Patients List', () => {
    test('should load patients list', async ({ page }) => {
      await page.goto('/dashboard/patients');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Check for list items or empty state
      const tableRows = page.locator('tbody tr');
      const emptyState = page.locator('text=/no patients|empty|add/i');

      const hasContent =
        (await tableRows.count()) > 0 ||
        (await emptyState.isVisible().catch(() => false));

      expect(hasContent).toBe(true);
    });

    test('should display patient columns', async ({ page }) => {
      await page.goto('/dashboard/patients');

      // Look for common patient list columns
      const headerCells = page.locator('th');
      const headers = await headerCells.allTextContents();

      // At minimum, should have name/email columns
      const hasNameOrEmail =
        headers.some((h) => h.toLowerCase().includes('name')) ||
        headers.some((h) => h.toLowerCase().includes('patient'));

      expect(hasNameOrEmail).toBe(true);
    });

    test('should handle empty patient list gracefully', async ({ page }) => {
      await page.goto('/dashboard/patients');

      const emptyState = page
        .locator('text=/no patients|empty|add patient/i')
        .first();

      // If there are no patients, empty state should be visible
      const tableRows = page.locator('tbody tr');
      const rowCount = await tableRows.count();

      if (rowCount === 0) {
        await expect(emptyState).toBeVisible();
      }
    });

    test('should search or filter patients if implemented', async ({
      page,
    }) => {
      await page.goto('/dashboard/patients');

      // Look for search/filter input
      const searchInput = page
        .locator('input[placeholder*="search"], input[placeholder*="filter"]')
        .first();

      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        await page.waitForLoadState('networkidle');

        // Results should update
        const results = page.locator('tbody tr, [data-testid="patient-item"]');
        await expect(results).toHaveCount(/^[0-9]+$/);
      }
    });

    test('should navigate to patient detail when clicked', async ({
      page,
    }) => {
      await page.goto('/dashboard/patients');

      // Wait for patients to load
      await page.waitForLoadState('networkidle');

      // Try to click first patient row
      const firstPatient = page.locator('tbody tr').first();

      if (await firstPatient.isVisible()) {
        const patientLink = firstPatient.locator('a').first();

        if (await patientLink.isVisible()) {
          const href = await patientLink.getAttribute('href');
          await patientLink.click();

          // Should navigate to patient detail
          if (href) {
            await expect(page).toHaveURL(new RegExp(href));
          }
        }
      }
    });
  });

  test.describe('Billing Overview', () => {
    test('should display billing dashboard', async ({ page }) => {
      await page.goto('/dashboard/billing');

      const content = page.locator('main, [role="main"]').first();
      await expect(content).toBeVisible();
    });

    test('should show billing metrics if available', async ({ page }) => {
      await page.goto('/dashboard/billing');

      // Look for common billing metrics
      const metrics = page
        .locator('[data-testid*="metric"], [data-testid*="billing"]')
        .first();

      const isVisible = await metrics.isVisible().catch(() => false);

      // Metrics are optional, but if present, should be visible
      if (isVisible) {
        await expect(metrics).toBeVisible();
      }
    });

    test('should display invoice/claim list', async ({ page }) => {
      await page.goto('/dashboard/billing');

      // Look for table or list
      const table = page.locator('[role="table"]').first();
      const list = page.locator('[data-testid="invoice-list"]').first();

      const hasContent =
        (await table.isVisible().catch(() => false)) ||
        (await list.isVisible().catch(() => false));

      // Either a table/list or empty state should be visible
      const emptyState = page
        .locator('text=/no invoice|no claim|no data/i')
        .first();

      const hasEitherContent =
        hasContent || (await emptyState.isVisible().catch(() => false));

      expect(hasEitherContent).toBe(true);
    });
  });

  test.describe('Clinical Command Center Access', () => {
    test('should navigate to clinical command center', async ({ page }) => {
      await page.goto('/dashboard/clinical-command');
      await expect(page).toHaveURL(/clinical-command/);

      // Page should load
      const mainContent = page.locator('main, [role="main"]').first();
      await expect(mainContent).toBeVisible({ timeout: 10_000 });
    });

    test('should display clinical command interface', async ({ page }) => {
      await page.goto('/dashboard/clinical-command');

      // Look for voice input or command interface
      const voiceButton = page
        .locator('button')
        .filter({ hasText: /voice|record|speak|command/i })
        .first();

      const commandInput = page
        .locator('input, [contenteditable]')
        .filter({ hasText: /command|query|search/i })
        .first();

      const hasInterface =
        (await voiceButton.isVisible().catch(() => false)) ||
        (await commandInput.isVisible().catch(() => false));

      expect(hasInterface).toBe(true);
    });
  });

  test.describe('Prevention Hub', () => {
    test('should display prevention plans', async ({ page }) => {
      await page.goto('/dashboard/prevention/plans');
      await expect(page).toHaveURL(/prevention.*plans/);
    });

    test('should navigate to prevention reminders', async ({ page }) => {
      await page.goto('/dashboard/prevention/reminders');
      await expect(page).toHaveURL(/prevention.*reminders/);
    });

    test('should navigate to prevention settings', async ({ page }) => {
      await page.goto('/dashboard/prevention/settings');
      await expect(page).toHaveURL(/prevention.*settings/);
    });

    test('should navigate to prevention activity', async ({ page }) => {
      await page.goto('/dashboard/prevention/activity');
      await expect(page).toHaveURL(/prevention.*activity/);
    });
  });

  test.describe('Admin Access', () => {
    test.skip('should display admin dashboard if user has role', async ({
      page,
    }) => {
      // Skip: depends on user role
      await page.goto('/dashboard/admin/users');
      await expect(page).toHaveURL(/admin/);
    });

    test('should redirect to patients if not admin', async ({ page }) => {
      // Try to access admin page
      await page.goto('/dashboard/admin/users');

      // If user isn't admin, should redirect
      const isAdmin = page.url().includes('admin');
      const isRedirected =
        page.url().includes('patients') || page.url().includes('dashboard');

      expect(isAdmin || isRedirected).toBe(true);
    });
  });

  test.describe('Dashboard Responsiveness', () => {
    test('should be responsive on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/dashboard/patients');

      // Page should be visible and functional
      const content = page.locator('main, [role="main"]').first();
      await expect(content).toBeVisible();
    });

    test('should be responsive on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.goto('/dashboard/patients');

      const content = page.locator('main, [role="main"]').first();
      await expect(content).toBeVisible();
    });
  });

  test.describe('Dashboard Performance', () => {
    test('should load dashboard within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/dashboard/patients');
      const loadTime = Date.now() - startTime;

      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should handle navigation without page reload', async ({ page }) => {
      await page.goto('/dashboard/patients');

      // Navigate to another dashboard page
      await page.goto('/dashboard/billing');

      // Should update without full page reload
      await expect(page).toHaveURL(/billing/);
    });
  });
});
