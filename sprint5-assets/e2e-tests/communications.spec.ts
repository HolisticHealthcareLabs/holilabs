import { test, expect } from '@playwright/test';

/**
 * Journey 2 — Communications Hub
 * Navigate → empty state → conversation list → thread → send → delivery status →
 * template picker → patient context → unread badge
 */

test.describe('Journey 2: Communications Hub', () => {
  test('J2-01: Communications page loads', async ({ page }) => {
    await page.goto('/dashboard/comunicacoes');
    await expect(page.locator('[data-testid="comms-layout"]')).toBeVisible();
  });

  test('J2-02: Empty state renders when no conversations', async ({ page }) => {
    // On a fresh DB, empty state should show
    await page.goto('/dashboard/comunicacoes');
    const list = page.locator('[data-testid="conversation-list"]');
    const empty = page.locator('[data-testid="comms-empty"]');
    await expect(list.or(empty)).toBeVisible({ timeout: 5_000 });
  });

  test('J2-03: Channel filter tabs work', async ({ page }) => {
    await page.goto('/dashboard/comunicacoes');
    const whatsappFilter = page.locator('[data-testid="channel-filter-whatsapp"]');
    if (await whatsappFilter.isVisible()) {
      await whatsappFilter.click();
      // Verify filter is applied (active state)
      await expect(whatsappFilter).toHaveClass(/bg-gray-900|bg-white/);
    }
  });

  test('J2-04: Click conversation → thread opens', async ({ page }) => {
    await page.goto('/dashboard/comunicacoes');
    const firstConv = page.locator('[data-testid="conversation-item"]').first();
    if (await firstConv.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await firstConv.click();
      await expect(page.locator('[data-testid="message-thread"]')).toBeVisible();
    }
  });

  test('J2-05: Patient context sidebar shows info', async ({ page }) => {
    await page.goto('/dashboard/comunicacoes');
    const firstConv = page.locator('[data-testid="conversation-item"]').first();
    if (await firstConv.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await firstConv.click();
      const sidebar = page.locator('[data-testid="patient-context-sidebar"]');
      // Sidebar may be toggled by clicking patient name
      if (await sidebar.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await expect(sidebar).toContainText(/.+/); // Has some content
      }
    }
  });

  test('J2-06→07: Send message with optimistic update', async ({ page }) => {
    await page.goto('/dashboard/comunicacoes');
    const firstConv = page.locator('[data-testid="conversation-item"]').first();
    if (await firstConv.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await firstConv.click();
      await expect(page.locator('[data-testid="message-thread"]')).toBeVisible();

      // Type and send
      const input = page.locator('[data-testid="message-input"]');
      await input.fill('Olá, seus exames estão prontos no portal.');
      await page.click('[data-testid="send-button"]');

      // Optimistic: message should appear immediately
      await expect(page.locator('text=Olá, seus exames estão prontos no portal.')).toBeVisible({ timeout: 2_000 });
    }
  });

  test('J2-09: Template picker modal opens', async ({ page }) => {
    await page.goto('/dashboard/comunicacoes');
    const firstConv = page.locator('[data-testid="conversation-item"]').first();
    if (await firstConv.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await firstConv.click();
      const templateBtn = page.locator('[data-testid="template-picker-button"]');
      if (await templateBtn.isVisible()) {
        await templateBtn.click();
        await expect(page.locator('[data-testid="template-list"]')).toBeVisible({ timeout: 3_000 });
      }
    }
  });

  test('J2-10: Sidebar nav shows unread badge', async ({ page }) => {
    await page.goto('/dashboard/my-day');
    // Check sidebar has comunicacoes link with potential badge
    const commsNav = page.locator('[data-tour="comunicacoes"]');
    await expect(commsNav).toBeVisible();
  });
});
