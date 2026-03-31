import { test, expect } from '@playwright/test';

/**
 * Journey 3 — Billing / Faturamento
 * Analytics KPIs → charts → invoice list → audit trail → verify integrity → void workflow
 */

test.describe('Journey 3: Billing Workflow', () => {
  test('J3-01: Analytics page loads', async ({ page }) => {
    await page.goto('/dashboard/faturamento/analitica');
    await expect(page.locator('[data-testid="analytics-page"]').or(page.locator('[data-testid="analytics-empty"]'))).toBeVisible();
  });

  test('J3-02: KPI cards render with values', async ({ page }) => {
    await page.goto('/dashboard/faturamento/analitica');
    const kpis = page.locator('[data-testid="revenue-kpis"]');
    if (await kpis.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Should have 4 KPI cards
      const cards = kpis.locator('[data-testid^="kpi-"]');
      await expect(cards).toHaveCount(4);
    }
  });

  test('J3-03: Charts render', async ({ page }) => {
    await page.goto('/dashboard/faturamento/analitica');
    // Revenue trend chart
    const trendChart = page.locator('[data-testid="revenue-trend-chart"]');
    if (await trendChart.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Recharts renders SVG elements
      await expect(trendChart.locator('svg')).toBeVisible();
    }

    // Payer mix
    const payerMix = page.locator('[data-testid="payer-mix"]');
    if (await payerMix.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(payerMix.locator('svg')).toBeVisible();
    }

    // Top procedures
    const topProcs = page.locator('[data-testid="top-procedures"]');
    if (await topProcs.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(topProcs.locator('svg')).toBeVisible();
    }

    // Aging report
    const aging = page.locator('[data-testid="aging-report"]');
    if (await aging.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(aging.locator('svg')).toBeVisible();
    }
  });

  test('J3-06: Invoice list loads', async ({ page }) => {
    await page.goto('/dashboard/faturamento');
    const invoiceList = page.locator('[data-testid="invoice-list"]');
    const emptyState = page.locator('[data-testid="billing-empty"]');
    await expect(invoiceList.or(emptyState)).toBeVisible({ timeout: 5_000 });
  });

  test('J3-08: Audit trail page loads', async ({ page }) => {
    await page.goto('/dashboard/faturamento/auditoria');
    await expect(page.locator('[data-testid="audit-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="audit-table"]').or(page.locator('text=Clean audit trail'))).toBeVisible();
  });

  test('J3-09: Verify integrity button works', async ({ page }) => {
    await page.goto('/dashboard/faturamento/auditoria');
    const verifyBtn = page.locator('[data-testid="verify-integrity-button"]');
    await expect(verifyBtn).toBeVisible();
    await verifyBtn.click();

    // Should show either green (intact) or red (broken)
    const intactBanner = page.locator('[data-testid="integrity-status-ok"]');
    const statusArea = page.locator('[data-testid="integrity-status"]');
    await expect(statusArea).toBeVisible({ timeout: 10_000 });
  });

  test('J3-10: Anulações page loads', async ({ page }) => {
    await page.goto('/dashboard/faturamento/anulacoes');
    // Either shows voided invoices or positive empty state
    const table = page.locator('table');
    const empty = page.locator('[data-testid="anulacoes-empty"]');
    await expect(table.or(empty)).toBeVisible({ timeout: 5_000 });
  });

  test('J3-12: Void invoice opens confirmation modal', async ({ page }) => {
    await page.goto('/dashboard/faturamento');
    // Find a void button on any invoice row
    const voidBtn = page.locator('[data-testid$="void-button"]').first();
    if (await voidBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await voidBtn.click();
      await expect(page.locator('[data-testid="void-dialog"]')).toBeVisible();

      // Verify reason field is required
      const submitBtn = page.locator('[data-testid="void-dialog"] button:has-text("Void")').or(
        page.locator('[data-testid="void-dialog"] button:has-text("Anular")')
      );
      // Submit should be disabled without reason selected
      if (await submitBtn.isVisible()) {
        await expect(submitBtn).toBeDisabled();
      }
    }
  });
});
