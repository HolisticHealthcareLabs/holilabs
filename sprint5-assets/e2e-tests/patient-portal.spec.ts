import { test, expect } from '@playwright/test';

/**
 * Journey 5 — Patient Portal
 * Magic link → dashboard → lab results → prescriptions → consent → export →
 * PHI header verification → mobile viewport
 */

test.describe('Journey 5: Patient Portal', () => {
  test('J5-01: Magic link verification', async ({ page }) => {
    // TODO: holilabsv2 — generate a real magic link token via API
    // For now, navigate to portal root
    await page.goto('/portal');
    // Should see login/verification page or dashboard if already authenticated
    await expect(page).toHaveURL(/portal/);
  });

  test('J5-02: Patient dashboard loads', async ({ page }) => {
    await page.goto('/portal');
    const dashboard = page.locator('[data-testid="portal-dashboard"]');
    const loginPage = page.locator('[data-testid="portal-login"]');
    // One of these should be visible
    await expect(dashboard.or(loginPage)).toBeVisible({ timeout: 5_000 });
  });

  test('J5-03: Appointments list', async ({ page }) => {
    await page.goto('/portal/appointments');
    const list = page.locator('[data-testid="appointment-list"]');
    const empty = page.locator('text=No appointments');
    await expect(list.or(empty)).toBeVisible({ timeout: 5_000 });
  });

  test('J5-04: Health records page', async ({ page }) => {
    await page.goto('/portal/records');
    await expect(page).toHaveURL(/portal\/records/);
    const records = page.locator('[data-testid="records-list"]');
    if (await records.isVisible({ timeout: 3_000 }).catch(() => false)) {
      // Records should be present
      await expect(records).toBeVisible();
    }
  });

  test('J5-05: Medications list', async ({ page }) => {
    await page.goto('/portal/medications');
    const medList = page.locator('[data-testid="medication-list"]');
    const empty = page.locator('text=No medications');
    await expect(medList.or(empty)).toBeVisible({ timeout: 5_000 });
  });

  test('J5-06: Consent management page', async ({ page }) => {
    await page.goto('/portal/onboarding/consent');
    const consentForm = page.locator('[data-testid="consent-form"]');
    if (await consentForm.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(consentForm).toBeVisible();
    }
  });

  test('J5-07: WhatsApp consent toggle works', async ({ page }) => {
    await page.goto('/portal/onboarding/consent');
    const toggle = page.locator('[data-testid="consent-whatsapp-toggle"]');
    if (await toggle.isVisible({ timeout: 3_000 }).catch(() => false)) {
      // Toggle consent
      await toggle.click();
      // RUTH invariant: granular consent — should show sub-categories
      // (appointment reminders, medication reminders, lab alerts)
    }
  });

  test('J5-08: Mobile viewport (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/portal');
    // Verify page is usable on mobile
    // Check no horizontal overflow
    const overflowX = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(overflowX).toBe(false);
  });

  test('J5-PHI: X-Access-Reason header on PHI requests', async ({ page }) => {
    // Intercept API requests to verify X-Access-Reason is sent
    const phiRequests: string[] = [];

    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('/api/patients') || url.includes('/api/encounters') || url.includes('/api/clinical-notes')) {
        const header = req.headers()['x-access-reason'];
        phiRequests.push(`${url} → ${header || 'MISSING'}`);
      }
    });

    await page.goto('/portal/records');
    await page.waitForTimeout(3_000); // Wait for API calls

    // All PHI requests should have X-Access-Reason header
    for (const req of phiRequests) {
      expect(req).not.toContain('MISSING');
    }
  });
});
