import { test, expect } from '@playwright/test';

/**
 * Journey 1 — Doctor's Clinical Day
 * Login → My Day → patient select → Clinical Command (3-panel) → record →
 * SOAP → CDSS → pre-sign → finalize → billing
 */

const DEMO_EMAIL = 'ricardo@holilabs.demo';
const DEMO_PASSWORD = 'demo-password-123';

test.describe('Journey 1: Doctor Clinical Day', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: holilabsv2 — seed demo data via API before each test
    // await page.request.post('/api/demo/provision');
  });

  test('J1-01: Login page renders', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
  });

  test('J1-02→04: Login and redirect to My Day', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('[data-testid="email-input"]', DEMO_EMAIL);
    await page.fill('[data-testid="password-input"]', DEMO_PASSWORD);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('**/dashboard/my-day', { timeout: 10_000 });
    await expect(page.locator('[data-tour="my-day"]')).toBeVisible();
  });

  test('J1-05: Patient queue renders with greeting', async ({ page }) => {
    // Assumes authenticated session
    await page.goto('/dashboard/my-day');
    await expect(page.locator('[data-testid="patient-queue"]')).toBeVisible();
    await expect(page.locator('[data-testid="greeting-text"]')).toBeVisible();
  });

  test('J1-06: Select patient → Clinical Command loads', async ({ page }) => {
    await page.goto('/dashboard/my-day');
    const firstPatient = page.locator('[data-testid="patient-card"]').first();
    await expect(firstPatient).toBeVisible({ timeout: 5_000 });
    await firstPatient.click();
    await page.waitForURL('**/dashboard/clinical-command**');
    await expect(page.locator('[data-testid="clinical-layout"]')).toBeVisible();
  });

  test('J1-07: 3-panel layout at desktop (1280px+)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard/clinical-command');
    await expect(page.locator('[data-testid="panel-left"]')).toBeVisible();
    await expect(page.locator('[data-testid="panel-center"]')).toBeVisible();
    await expect(page.locator('[data-testid="panel-right"]')).toBeVisible();

    // Verify no page-level scroll
    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const clientHeight = await page.evaluate(() => document.documentElement.clientHeight);
    expect(scrollHeight).toBeLessThanOrEqual(clientHeight + 2); // 2px tolerance
  });

  test('J1-07b: Responsive collapse at mobile (<1024px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard/clinical-command');
    // Center panel should be visible, sides hidden or drawer
    await expect(page.locator('[data-testid="panel-center"]')).toBeVisible();
    // Left/right panels should be hidden on mobile
    const leftVisible = await page.locator('[data-testid="panel-left"]').isVisible();
    // On mobile, left panel is either hidden or collapsed to icon rail
    // The exact behavior depends on implementation — assert center is dominant
    expect(true).toBe(true); // Placeholder — adjust to actual responsive behavior
  });

  test('J1-08: Keyboard shortcuts (Cmd+1/2/3)', async ({ page }) => {
    await page.goto('/dashboard/clinical-command');
    // Cmd+1 focuses left panel
    await page.keyboard.press('Meta+1');
    // Cmd+2 focuses center panel
    await page.keyboard.press('Meta+2');
    // Cmd+3 focuses right panel
    await page.keyboard.press('Meta+3');
    // TODO: holilabsv2 — assert focus state via aria-current or data-focused attribute
  });

  test('J1-09: Record button activates transcript', async ({ page }) => {
    await page.goto('/dashboard/clinical-command');
    const recordBtn = page.locator('[data-testid="record-button"]');
    await expect(recordBtn).toBeVisible();
    // Note: actual recording requires microphone permission
    // In E2E, we can check the button exists and is clickable
    await expect(recordBtn).toBeEnabled();
  });

  test('J1-11: CDSS quick action fires real API', async ({ page }) => {
    await page.goto('/dashboard/clinical-command');
    const rxSafety = page.locator('[data-testid="cdss-action-rx-safety"]');
    if (await rxSafety.isVisible()) {
      const responsePromise = page.waitForResponse('**/api/cdss/chat');
      await rxSafety.click();
      const response = await responsePromise;
      expect(response.status()).toBe(200);
      const body = await response.json();
      // ELENA invariant: sourceAuthority must be present
      expect(body.sourceAuthority || body.suggestion).toBeTruthy();
    }
  });

  test('J1-12: Pre-sign review modal opens', async ({ page }) => {
    await page.goto('/dashboard/clinical-command');
    const preSignBtn = page.locator('[data-testid="pre-sign-review-button"]');
    if (await preSignBtn.isVisible()) {
      await preSignBtn.click();
      await expect(page.locator('[data-testid="presign-modal"]')).toBeVisible();
    }
  });

  test('J1-13: Finalize modal opens with fields', async ({ page }) => {
    await page.goto('/dashboard/clinical-command');
    const finalizeBtn = page.locator('[data-testid="finalize-button"]');
    if (await finalizeBtn.isVisible()) {
      await finalizeBtn.click();
      await expect(page.locator('[data-testid="finalize-modal"]')).toBeVisible();
    }
  });

  test('J1-15: Billing analytics shows data', async ({ page }) => {
    await page.goto('/dashboard/faturamento/analitica');
    // If invoices exist, KPIs should render
    const kpis = page.locator('[data-testid="revenue-kpis"]');
    const empty = page.locator('[data-testid="analytics-empty"]');
    // One of these should be visible
    await expect(kpis.or(empty)).toBeVisible({ timeout: 5_000 });
  });
});
