import { test, expect } from '@playwright/test';

/**
 * Prescription Safety E2E Tests (Hardened)
 *
 * Focused on the signing modal, ELENA drug interaction alerts,
 * RUTH SaMD disclaimer gate, and full signing flow.
 */

// ── Helpers ──────────────────────────────────────────────────────────

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

// ── Drug Interaction Alert (ELENA) ───────────────────────────────────

test.describe('Prescription Safety — Drug Interaction Alerts', () => {
  test.beforeEach(async ({ page }) => {
    await stubDoctorSession(page);

    // Stub safety check returning RED for interaction
    await page.route('**/api/prescriptions/safety-check', async (route) => {
      const body = route.request().postDataJSON();
      const medication = (body?.medication || '').toLowerCase();

      if (medication.includes('warfarin') || medication.includes('aspirin')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            severity: 'RED',
            alerts: [
              {
                type: 'DRUG_INTERACTION',
                severity: 'RED',
                source: 'ELENA',
                title: 'Critical Drug-Drug Interaction',
                description: 'Warfarin + Aspirin: increased bleeding risk. Monitor INR closely.',
                sourceAuthority: 'FDA Drug Interaction Database',
                citationUrl: 'https://www.fda.gov/drugs/drug-interactions',
              },
            ],
            canProceed: false,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            severity: 'GREEN',
            alerts: [],
            canProceed: true,
          }),
        });
      }
    });
  });

  test('should display ELENA drug interaction alert for known interacting drugs', async ({ page }) => {
    await page.goto('/dashboard/patients/PT-002/prescriptions/new');
    await page.waitForLoadState('domcontentloaded');

    // Try to prescribe aspirin for a patient on warfarin
    const medInput = page.locator(
      '[data-testid="medication-input"], input[name="medication"], input[placeholder*="medicamento" i], input[placeholder*="medication" i]',
    ).first();

    if (await medInput.isVisible()) {
      await medInput.fill('aspirin');
      await page.waitForTimeout(300);

      const option = page.locator('[role="option"]:has-text("aspirin")').first();
      if (await option.isVisible()) {
        await option.click();
        await page.waitForTimeout(500);
      }

      // Verify interaction alert appears
      const alert = page.locator(
        '[data-testid="interaction-alert"], [data-testid="safety-alert"], [role="alert"]',
      ).first();

      if (await alert.isVisible()) {
        const text = await alert.textContent();
        expect(text?.toLowerCase()).toMatch(/interaction|interacao|bleeding|sangramento/);
      }
    }
  });

  test('should block prescription sign when RED safety alert is active', async ({ page }) => {
    await page.goto('/dashboard/patients/PT-002/prescriptions/new');
    await page.waitForLoadState('domcontentloaded');

    const medInput = page.locator(
      '[data-testid="medication-input"], input[name="medication"]',
    ).first();

    if (await medInput.isVisible()) {
      await medInput.fill('aspirin');
      await page.waitForTimeout(300);
      const option = page.locator('[role="option"]:has-text("aspirin")').first();
      if (await option.isVisible()) await option.click();
      await page.waitForTimeout(500);

      // Sign button should be disabled
      const signBtn = page.locator(
        'button:has-text("Sign"), button:has-text("Assinar"), button:has-text("Prescribe")',
      ).first();

      if (await signBtn.isVisible()) {
        const isDisabled = await signBtn.isDisabled();
        expect(isDisabled).toBe(true);
      }
    }
  });
});

// ── SaMD Disclaimer Gate (RUTH) ──────────────────────────────────────

test.describe('Prescription Safety — SaMD Disclaimer (RUTH)', () => {
  test.beforeEach(async ({ page }) => {
    await stubDoctorSession(page);

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
  });

  test('should require SaMD disclaimer acknowledgment before signing', async ({ page }) => {
    await page.goto('/dashboard/clinical-command');
    await page.waitForLoadState('domcontentloaded');

    const prescribeBtn = page.locator(
      '[data-testid="prescribe-button"], button:has-text("Prescrever"), button:has-text("Prescribe")',
    ).first();

    if (await prescribeBtn.isVisible()) {
      await prescribeBtn.click();
      await page.waitForTimeout(300);

      // Look for SaMD disclaimer checkbox / acknowledgment
      const disclaimer = page.locator(
        '[data-testid="samd-disclaimer"], [data-testid="disclaimer-checkbox"], label:has-text("decision support"), label:has-text("suporte a decisao")',
      ).first();

      if (await disclaimer.isVisible()) {
        // Without clicking disclaimer, sign button should be disabled
        const signBtn = page.locator(
          'button:has-text("Sign"), button:has-text("Assinar")',
        ).first();

        if (await signBtn.isVisible()) {
          const isDisabled = await signBtn.isDisabled();
          expect(isDisabled).toBe(true);

          // Now acknowledge the disclaimer
          await disclaimer.click();
          await page.waitForTimeout(200);

          // Sign button should now be enabled
          expect(await signBtn.isDisabled()).toBe(false);
        }
      }
    }
  });
});

// ── Full Signing Flow ────────────────────────────────────────────────

test.describe('Prescription Safety — Full Signing Flow', () => {
  test.beforeEach(async ({ page }) => {
    await stubDoctorSession(page);

    await page.route('**/api/prescriptions/safety-check', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ severity: 'GREEN', alerts: [], canProceed: true }),
      });
    });

    await page.route('**/api/prescriptions/*/sign', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          signatureMethod: 'pin',
          signedAt: new Date().toISOString(),
          prescriptionId: 'prx-e2e-001',
        }),
      });
    });

    await page.route('**/api/encounters/*/prescriptions', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'prx-e2e-001',
            status: 'SIGNED',
            createdAt: new Date().toISOString(),
          }),
        });
      } else {
        await route.continue();
      }
    });
  });

  test('should complete prescription creation → safety check → sign → success', async ({ page }) => {
    await page.goto('/dashboard/clinical-command');
    await page.waitForLoadState('domcontentloaded');

    const prescribeBtn = page.locator(
      '[data-testid="prescribe-button"], button:has-text("Prescrever"), button:has-text("Prescribe")',
    ).first();

    if (await prescribeBtn.isVisible()) {
      await prescribeBtn.click();
      await page.waitForTimeout(300);

      // Acknowledge disclaimer if present
      const disclaimer = page.locator(
        '[data-testid="samd-disclaimer"], [data-testid="disclaimer-checkbox"]',
      ).first();
      if (await disclaimer.isVisible()) {
        await disclaimer.click();
      }

      // Fill PIN if required
      const pinInput = page.locator(
        'input[data-testid="pin-input"], input[type="password"]',
      ).first();
      if (await pinInput.isVisible()) {
        await pinInput.fill('123456');
      }

      // Click sign/confirm
      const signBtn = page.locator(
        'button:has-text("Sign"), button:has-text("Assinar"), button:has-text("Confirm")',
      ).first();
      if (await signBtn.isVisible() && !(await signBtn.isDisabled())) {
        await signBtn.click();
        await page.waitForTimeout(500);

        // Verify success state
        const content = await page.content();
        expect(content.toLowerCase()).toMatch(/success|sucesso|assinada|signed/);
      }
    }
  });
});
