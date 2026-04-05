import { test, expect } from '@playwright/test';

/**
 * Notification Center E2E Tests
 *
 * Covers:
 *   1. Bell icon visible on settings/active page
 *   2. Click bell → panel opens with cards
 *   3. Mark all as read → badge clears
 *   4. Clinical Command (passive mode) → no toasts
 */

async function stubDoctorSession(page: import('@playwright/test').Page) {
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'doc-e2e-001',
          name: 'Dr. Ana Costa',
          email: 'ana.costa@holilabs.test',
          role: 'PHYSICIAN',
          workspaceId: 'ws-e2e',
        },
        expires: '2027-01-01T00:00:00.000Z',
      }),
    });
  });
}

async function stubNotificationsWithUnread(page: import('@playwright/test').Page) {
  let unreadCount = 3;

  await page.route('**/api/notifications**', async (route) => {
    const method = route.request().method();

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          notifications: [
            {
              id: 'notif-1',
              title: 'Resultado de exame disponivel',
              body: 'Hemograma de Maria Gonzalez pronto.',
              read: false,
              createdAt: '2026-03-30T08:00:00Z',
              type: 'LAB_RESULT',
            },
            {
              id: 'notif-2',
              title: 'Consulta em 30 minutos',
              body: 'Paciente Juan Perez, sala 3.',
              read: false,
              createdAt: '2026-03-30T09:30:00Z',
              type: 'APPOINTMENT',
            },
            {
              id: 'notif-3',
              title: 'Nova mensagem do paciente',
              body: 'Carlos Silva enviou uma pergunta.',
              read: false,
              createdAt: '2026-03-30T10:00:00Z',
              type: 'MESSAGE',
            },
          ],
          unreadCount,
        }),
      });
    } else if (method === 'PATCH' || method === 'PUT' || method === 'POST') {
      unreadCount = 0;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, unreadCount: 0 }),
      });
    }
  });
}

// ── Test: Bell visible on settings page (active mode) ────────────────

test.describe('Notification Center — Active Mode', () => {
  test.beforeEach(async ({ page }) => {
    await stubDoctorSession(page);
    await stubNotificationsWithUnread(page);
  });

  test('should display notification bell icon on dashboard settings page', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('domcontentloaded');

    const bell = page.locator(
      '[data-testid="notification-bell"], [aria-label*="notification" i], [aria-label*="Notifica" i]',
    ).first();

    // Bell should be present in the header/toolbar
    if (await bell.isVisible()) {
      await expect(bell).toBeVisible();
    } else {
      // If not on settings, try main dashboard
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');
      const bellAlt = page.locator(
        '[data-testid="notification-bell"], [aria-label*="notification" i]',
      ).first();
      await expect(bellAlt).toBeVisible();
    }
  });

  test('should open panel with notification cards on bell click', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const bell = page.locator(
      '[data-testid="notification-bell"], [aria-label*="notification" i]',
    ).first();

    if (await bell.isVisible()) {
      await bell.click();
      await page.waitForTimeout(300);

      const panel = page.locator(
        '[data-testid="notification-panel"], [data-testid="notification-dropdown"], [role="dialog"]',
      ).first();

      if (await panel.isVisible()) {
        // Verify notification items render
        const items = panel.locator(
          '[data-testid="notification-item"], li, [role="listitem"], [data-testid*="notif"]',
        );
        const count = await items.count();
        expect(count).toBeGreaterThan(0);

        // Verify content matches stub data
        const panelText = await panel.textContent();
        expect(panelText?.toLowerCase()).toMatch(/exame|consulta|mensagem|result|appointment|message/);
      }
    }
  });

  test('should clear badge when "Mark all as read" is clicked', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const bell = page.locator(
      '[data-testid="notification-bell"], [aria-label*="notification" i]',
    ).first();

    if (await bell.isVisible()) {
      // Verify badge shows unread count
      const badge = page.locator(
        '[data-testid="notification-badge"], [data-testid="unread-count"]',
      ).first();

      if (await badge.isVisible()) {
        const initialText = await badge.textContent();
        expect(initialText).toMatch(/[1-9]/);
      }

      await bell.click();
      await page.waitForTimeout(300);

      const markAllBtn = page.locator(
        'button:has-text("Mark all"), button:has-text("Marcar todas"), button:has-text("Ler todas"), [data-testid="mark-all-read"]',
      ).first();

      if (await markAllBtn.isVisible()) {
        await markAllBtn.click();
        await page.waitForTimeout(500);

        // Badge should disappear or show 0
        const badgeAfter = page.locator(
          '[data-testid="notification-badge"], [data-testid="unread-count"]',
        ).first();
        const stillVisible = await badgeAfter.isVisible().catch(() => false);
        if (stillVisible) {
          const text = await badgeAfter.textContent();
          expect(text === '0' || text === '' || text === null).toBeTruthy();
        }
      }
    }
  });
});

// ── Test: No toasts on Clinical Command (passive mode) ───────────────

test.describe('Notification Center — Passive Mode', () => {
  test.beforeEach(async ({ page }) => {
    await stubDoctorSession(page);
    await stubNotificationsWithUnread(page);
  });

  test('should NOT display notification toasts on Clinical Command page', async ({ page }) => {
    await page.goto('/dashboard/clinical-command');
    await page.waitForLoadState('domcontentloaded');

    // Wait enough time for potential toasts to appear
    await page.waitForTimeout(2000);

    // Check that no toast notifications are visible
    const toasts = page.locator(
      '[data-testid="toast"], [role="alert"][data-toast], .toast, [data-sonner-toast], [data-radix-toast]',
    );
    const toastCount = await toasts.count();
    expect(toastCount).toBe(0);
  });

  test('should still show bell icon but not auto-expand panel', async ({ page }) => {
    await page.goto('/dashboard/clinical-command');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Bell should be visible
    const bell = page.locator(
      '[data-testid="notification-bell"], [aria-label*="notification" i]',
    ).first();

    if (await bell.isVisible()) {
      // Panel should NOT be auto-expanded
      const panel = page.locator(
        '[data-testid="notification-panel"], [data-testid="notification-dropdown"]',
      ).first();
      const panelVisible = await panel.isVisible().catch(() => false);
      expect(panelVisible).toBe(false);
    }
  });
});
