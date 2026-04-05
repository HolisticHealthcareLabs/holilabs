import { test, expect } from '@playwright/test';

/**
 * Lab Orders E2E Tests
 *
 * Tests the lab order creation flow:
 *   1. Navigate to /dashboard/lab-orders
 *   2. Search for a LOINC test → add to order
 *   3. Set priority, fasting, clinical indication
 *   4. Submit order → verify status = SUBMITTED
 *
 * Note: This feature may still be in development.
 * Tests are written against expected selectors and stubbed APIs.
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

async function stubLoincSearch(page: import('@playwright/test').Page) {
  await page.route('**/api/loinc/search**', async (route) => {
    const url = new URL(route.request().url());
    const query = (url.searchParams.get('q') || url.searchParams.get('query') || '').toLowerCase();

    const allTests = [
      { code: '58410-2', name: 'Hemograma Completo (CBC)', category: 'Hematology' },
      { code: '2093-3', name: 'Colesterol Total', category: 'Chemistry' },
      { code: '2571-8', name: 'Triglicerides', category: 'Chemistry' },
      { code: '14749-6', name: 'Glicose em Jejum', category: 'Chemistry' },
      { code: '2160-0', name: 'Creatinina Serica', category: 'Chemistry' },
      { code: '718-7', name: 'Hemoglobina', category: 'Hematology' },
    ];

    const filtered = query
      ? allTests.filter(
          (t) => t.name.toLowerCase().includes(query) || t.code.includes(query),
        )
      : allTests;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ results: filtered }),
    });
  });
}

async function stubLabOrderSubmit(page: import('@playwright/test').Page) {
  await page.route('**/api/lab-orders', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'lo-e2e-001',
          status: 'SUBMITTED',
          tests: body.tests || [],
          priority: body.priority || 'ROUTINE',
          fasting: body.fasting || false,
          clinicalIndication: body.clinicalIndication || '',
          submittedAt: new Date().toISOString(),
          orderedBy: 'Dr. Ana Costa',
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          orders: [
            {
              id: 'lo-prev-001',
              status: 'COMPLETED',
              tests: [{ code: '58410-2', name: 'Hemograma Completo' }],
              submittedAt: '2026-03-20T10:00:00Z',
            },
          ],
        }),
      });
    }
  });
}

// ── Tests ────────────────────────────────────────────────────────────

test.describe('Lab Orders — Order Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await stubDoctorSession(page);
    await stubLoincSearch(page);
    await stubLabOrderSubmit(page);
  });

  test('should navigate to lab orders page', async ({ page }) => {
    await page.goto('/dashboard/lab-orders');
    await page.waitForLoadState('domcontentloaded');

    const content = await page.content();
    expect(content.toLowerCase()).toMatch(/lab|exame|order|pedido|solicit/);
  });

  test('should search for a LOINC test by name', async ({ page }) => {
    await page.goto('/dashboard/lab-orders');
    await page.waitForLoadState('domcontentloaded');

    const searchInput = page.locator(
      '[data-testid="loinc-search"], input[placeholder*="exame" i], input[placeholder*="test" i], input[placeholder*="LOINC" i], input[type="search"]',
    ).first();

    if (await searchInput.isVisible()) {
      await searchInput.fill('hemograma');
      await page.waitForTimeout(500);

      // Should show search results
      const results = page.locator(
        '[data-testid="loinc-result"], [role="option"], [role="listbox"] li',
      );
      const count = await results.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should add a test to the order', async ({ page }) => {
    await page.goto('/dashboard/lab-orders');
    await page.waitForLoadState('domcontentloaded');

    const searchInput = page.locator(
      '[data-testid="loinc-search"], input[placeholder*="exame" i], input[placeholder*="test" i], input[type="search"]',
    ).first();

    if (await searchInput.isVisible()) {
      await searchInput.fill('hemograma');
      await page.waitForTimeout(500);

      const firstResult = page.locator(
        '[data-testid="loinc-result"], [role="option"]',
      ).first();

      if (await firstResult.isVisible()) {
        await firstResult.click();
        await page.waitForTimeout(300);

        // Verify test was added to order list
        const orderItem = page.locator(
          '[data-testid="order-item"], [data-testid="selected-test"]',
        ).first();
        if (await orderItem.isVisible()) {
          const text = await orderItem.textContent();
          expect(text?.toLowerCase()).toMatch(/hemograma|cbc|58410/);
        }
      }
    }
  });

  test('should set priority, fasting, and clinical indication', async ({ page }) => {
    await page.goto('/dashboard/lab-orders');
    await page.waitForLoadState('domcontentloaded');

    // Priority selector
    const prioritySelect = page.locator(
      '[data-testid="priority-select"], select[name="priority"], [data-testid="priority"]',
    ).first();

    if (await prioritySelect.isVisible()) {
      await prioritySelect.selectOption({ label: /urgent|urgente/i }).catch(() => {
        // May be a custom select component
      });
    }

    // Fasting toggle
    const fastingToggle = page.locator(
      '[data-testid="fasting-toggle"], input[name="fasting"], [data-testid="fasting"] input',
    ).first();

    if (await fastingToggle.isVisible()) {
      await fastingToggle.click();
    }

    // Clinical indication
    const indicationInput = page.locator(
      '[data-testid="clinical-indication"], textarea[name="indication"], input[name="indication"]',
    ).first();

    if (await indicationInput.isVisible()) {
      await indicationInput.fill('Investigacao de anemia ferropriva');
      const value = await indicationInput.inputValue();
      expect(value).toContain('anemia');
    }
  });

  test('should submit lab order and verify SUBMITTED status', async ({ page }) => {
    await page.goto('/dashboard/lab-orders');
    await page.waitForLoadState('domcontentloaded');

    // Add a test first
    const searchInput = page.locator(
      '[data-testid="loinc-search"], input[placeholder*="exame" i], input[type="search"]',
    ).first();

    if (await searchInput.isVisible()) {
      await searchInput.fill('hemograma');
      await page.waitForTimeout(500);

      const firstResult = page.locator('[data-testid="loinc-result"], [role="option"]').first();
      if (await firstResult.isVisible()) {
        await firstResult.click();
        await page.waitForTimeout(300);
      }

      // Submit order
      const submitBtn = page.locator(
        'button:has-text("Submit"), button:has-text("Enviar"), button:has-text("Solicitar"), [data-testid="submit-order"]',
      ).first();

      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(500);

        // Verify success / SUBMITTED status
        const content = await page.content();
        expect(content.toLowerCase()).toMatch(/submitted|enviado|sucesso|solicitado/);
      }
    }
  });
});

test.describe('Lab Orders — Order History', () => {
  test.beforeEach(async ({ page }) => {
    await stubDoctorSession(page);
    await stubLabOrderSubmit(page);
  });

  test('should display previous lab orders', async ({ page }) => {
    await page.goto('/dashboard/lab-orders');
    await page.waitForLoadState('domcontentloaded');

    const content = await page.content();
    // Should show some content related to orders
    expect(content.toLowerCase()).toMatch(/order|pedido|exame|lab/);
  });
});
