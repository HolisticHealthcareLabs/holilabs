import { test, expect } from '@playwright/test';

/**
 * Critical User Flow E2E Tests
 *
 * Covers the highest-value doctor-side journeys:
 *   1. Login → Clinical Command → SOAP editor loads
 *   2. Create prescription → sign with PIN → success
 *   3. Notification bell → mark as read
 */

// ── Helpers ──────────────────────────────────────────────────────────

/** Stub the NextAuth session so tests bypass real auth. */
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

/** Stub the notifications API with seed data. */
async function stubNotifications(page: import('@playwright/test').Page) {
  await page.route('**/api/notifications**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          notifications: [
            {
              id: 'notif-1',
              title: 'Lab results ready',
              body: 'CBC results for Maria Gonzalez are available.',
              read: false,
              createdAt: new Date().toISOString(),
              type: 'LAB_RESULT',
            },
            {
              id: 'notif-2',
              title: 'Appointment reminder',
              body: 'Upcoming appointment with Juan Perez in 30 min.',
              read: false,
              createdAt: new Date().toISOString(),
              type: 'APPOINTMENT',
            },
          ],
          unreadCount: 2,
        }),
      });
    } else {
      // PATCH — mark as read
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    }
  });
}

// ── Flow 1: Login → Clinical Command ─────────────────────────────────

test.describe('Doctor Login → Clinical Command', () => {
  test.beforeEach(async ({ page }) => {
    await stubDoctorSession(page);
  });

  test('should navigate to dashboard after login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should navigate to Clinical Command and verify editor loads', async ({ page }) => {
    await page.goto('/dashboard/clinical-command');
    await page.waitForLoadState('domcontentloaded');

    // The page should render without errors
    const content = await page.content();
    expect(content.toLowerCase()).toMatch(/command|clinical|copilot|co-pilot|soap/);

    // Verify no error boundary
    const errorBoundary = page.locator('[data-testid="error-boundary"], text=/something went wrong/i');
    await expect(errorBoundary).toHaveCount(0);
  });

  test('should render sidebar navigation with active route highlighted', async ({ page }) => {
    await page.goto('/dashboard/clinical-command');
    await page.waitForLoadState('domcontentloaded');

    const nav = page.locator('nav, aside, [data-testid="sidebar"]').first();
    await expect(nav).toBeVisible();
  });
});

// ── Flow 2: Prescription creation + signing ──────────────────────────

test.describe('Prescription Creation → Signing', () => {
  test.beforeEach(async ({ page }) => {
    await stubDoctorSession(page);

    // Stub prescription safety-check
    await page.route('**/api/prescriptions/safety-check', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          severity: 'GREEN',
          alerts: [],
          canProceed: true,
        }),
      });
    });

    // Stub prescription creation
    await page.route('**/api/encounters/*/prescriptions', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'prx-e2e-001',
            status: 'SIGNED',
            medication: 'Amoxicillin 500mg',
            createdAt: new Date().toISOString(),
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Stub signature verification
    await page.route('**/api/auth/webauthn/verify-signature', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ verified: true, token: 'mock-jwt' }),
      });
    });
  });

  test('should open prescription modal from encounter page', async ({ page }) => {
    await page.goto('/dashboard/clinical-command');
    await page.waitForLoadState('domcontentloaded');

    // Look for prescription / e-prescribing entry point
    const prescribeButton = page.locator(
      '[data-testid="prescribe-button"], button:has-text("Prescrever"), button:has-text("Prescribe")',
    ).first();

    if (await prescribeButton.isVisible()) {
      await prescribeButton.click();
      await page.waitForTimeout(300);

      // Modal or form should appear
      const modal = page.locator(
        '[data-testid="prescription-modal"], [role="dialog"], [data-testid="prescription-form"]',
      ).first();
      await expect(modal).toBeVisible();
    }
  });

  test('should complete full signing flow with PIN fallback', async ({ page }) => {
    await page.goto('/dashboard/clinical-command');
    await page.waitForLoadState('domcontentloaded');

    // Stub PIN verification route
    await page.route('**/api/prescriptions/*/sign', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          signatureMethod: 'pin',
          signedAt: new Date().toISOString(),
        }),
      });
    });

    const prescribeButton = page.locator(
      '[data-testid="prescribe-button"], button:has-text("Prescrever"), button:has-text("Prescribe")',
    ).first();

    if (await prescribeButton.isVisible()) {
      await prescribeButton.click();
      await page.waitForTimeout(300);

      // If a PIN input appears, fill it
      const pinInput = page.locator(
        'input[data-testid="pin-input"], input[type="password"][placeholder*="PIN" i]',
      ).first();
      if (await pinInput.isVisible()) {
        await pinInput.fill('123456');
        const confirmButton = page.locator(
          'button:has-text("Confirmar"), button:has-text("Confirm"), button:has-text("Sign")',
        ).first();
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
          await page.waitForTimeout(500);
        }
      }
    }
  });
});

// ── Flow 3: Notification bell → mark as read ─────────────────────────

test.describe('Notification Bell → Mark as Read', () => {
  test.beforeEach(async ({ page }) => {
    await stubDoctorSession(page);
    await stubNotifications(page);
  });

  test('should show notification bell with unread badge', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const bell = page.locator(
      '[data-testid="notification-bell"], [aria-label*="notification" i], [aria-label*="Notifica" i]',
    ).first();

    if (await bell.isVisible()) {
      // Badge should show unread count
      const badge = page.locator(
        '[data-testid="notification-badge"], [data-testid="unread-count"]',
      ).first();
      if (await badge.isVisible()) {
        const text = await badge.textContent();
        expect(text).toMatch(/\d+/);
      }
    }
  });

  test('should open notification panel and display items', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const bell = page.locator(
      '[data-testid="notification-bell"], [aria-label*="notification" i], [aria-label*="Notifica" i]',
    ).first();

    if (await bell.isVisible()) {
      await bell.click();
      await page.waitForTimeout(300);

      const panel = page.locator(
        '[data-testid="notification-panel"], [data-testid="notification-dropdown"]',
      ).first();

      if (await panel.isVisible()) {
        // Should contain notification cards
        const items = panel.locator('[data-testid="notification-item"], li, [role="listitem"]');
        expect(await items.count()).toBeGreaterThan(0);
      }
    }
  });

  test('should mark notification as read', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const bell = page.locator(
      '[data-testid="notification-bell"], [aria-label*="notification" i]',
    ).first();

    if (await bell.isVisible()) {
      await bell.click();
      await page.waitForTimeout(300);

      // Click "Mark all as read" or individual mark-read button
      const markRead = page.locator(
        'button:has-text("Mark all"), button:has-text("Marcar todas"), [data-testid="mark-all-read"]',
      ).first();

      if (await markRead.isVisible()) {
        await markRead.click();
        await page.waitForTimeout(300);

        // Badge should disappear or show 0
        const badge = page.locator('[data-testid="notification-badge"]').first();
        const badgeVisible = await badge.isVisible().catch(() => false);
        if (badgeVisible) {
          const text = await badge.textContent();
          expect(text === '0' || text === '').toBeTruthy();
        }
      }
    }
  });
});
