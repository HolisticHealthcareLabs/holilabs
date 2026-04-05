import { test, expect } from '@playwright/test';

/**
 * Auth Enforcement Security Tests
 *
 * Verifies that authentication and authorization controls
 * are properly enforced at the API and page level.
 */

const API_TIMEOUT = 30_000;

const PROTECTED_API_ROUTES = [
  '/api/patients',
  '/api/analytics/dashboard',
  '/api/audit',
];

const PROTECTED_PAGES = [
  '/dashboard',
  '/dashboard/patients',
  '/dashboard/billing',
  '/dashboard/clinical-command',
  '/dashboard/analytics',
];

test.describe('Auth Enforcement — Unauthenticated Access', () => {
  for (const route of PROTECTED_API_ROUTES) {
    test(`${route} returns 401/403 for unauthenticated requests`, async ({ request }) => {
      const response = await request.get(route, { timeout: API_TIMEOUT });
      const status = response.status();

      expect(
        status === 401 || status === 403,
        `${route} returned ${status} — expected 401 or 403`,
      ).toBe(true);
    });
  }

  for (const route of PROTECTED_PAGES) {
    test(`${route} redirects or blocks unauthenticated user`, async ({ page }) => {
      await page.goto(route, { timeout: API_TIMEOUT, waitUntil: 'domcontentloaded' });

      const url = page.url();
      const isRedirected =
        url.includes('/auth') ||
        url.includes('/sign-in') ||
        url.includes('/login');

      // If not redirected, check that the page doesn't show authenticated content
      if (!isRedirected) {
        const pageContent = await page.content();
        const hasAuthPrompt = /sign.?in|log.?in|authenticate/i.test(pageContent);
        const hasNoPatientData = !(/patient.*data|medical.*record/i.test(pageContent));
        expect(
          hasAuthPrompt || hasNoPatientData,
          `${route} shows authenticated content to unauthenticated user`,
        ).toBe(true);
      }
    });
  }
});

test.describe('Auth Enforcement — Tampered Tokens', () => {
  test('tampered session cookie returns 401 on API routes', async ({ request }) => {
    const response = await request.get('/api/patients', {
      timeout: API_TIMEOUT,
      headers: {
        Cookie: 'next-auth.session-token=tampered-invalid-token-value',
      },
    });

    const status = response.status();
    expect(
      status === 401 || status === 403,
      `Tampered cookie returned ${status} — expected 401 or 403`,
    ).toBe(true);
  });

  test('forged Authorization header returns 401', async ({ request }) => {
    const response = await request.get('/api/patients', {
      timeout: API_TIMEOUT,
      headers: {
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJoYWNrZXIiLCJyb2xlIjoiQURNSU4ifQ.invalid-signature',
      },
    });

    const status = response.status();
    expect(
      status === 401 || status === 403,
      `Forged JWT returned ${status} — expected 401 or 403`,
    ).toBe(true);
  });
});

test.describe('Auth Enforcement — Login Error Messages', () => {
  test('failed login returns generic error, does not reveal user existence', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('domcontentloaded');

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    if (await emailInput.isVisible() && await passwordInput.isVisible()) {
      // Mock the credentials callback to return an error
      await page.route('**/api/auth/callback/credentials', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ url: '/auth/login?error=CredentialsSignin' }),
        });
      });

      await emailInput.fill('nonexistent-user@attacker.com');
      await passwordInput.fill('WrongPassword123!');

      const tosCheckbox = page.locator('label:has(input[type="checkbox"])');
      if (await tosCheckbox.isVisible().catch(() => false)) {
        await tosCheckbox.click();
      }

      const submitButton = page.locator('button[type="submit"]').first();
      if (await submitButton.isEnabled().catch(() => false)) {
        await submitButton.click();
      }

      await page.waitForTimeout(2000);

      const pageContent = await page.content();
      const lowerContent = pageContent.toLowerCase();

      // Must NOT reveal whether user exists
      expect(lowerContent).not.toContain('user not found');
      expect(lowerContent).not.toContain('no account');
      expect(lowerContent).not.toContain('email not registered');
      expect(lowerContent).not.toContain('unknown user');
    }
  });
});

test.describe('Auth Enforcement — Horizontal Access Control', () => {
  test('API does not return patient data without valid session', async ({ request }) => {
    const response = await request.get('/api/patients/patient-id-12345', {
      timeout: API_TIMEOUT,
    });
    const status = response.status();

    expect(
      status === 401 || status === 403 || status === 404,
      `Patient record access returned ${status} — expected 401/403/404`,
    ).toBe(true);

    if (status !== 404) {
      const body = await response.text();
      expect(body).not.toMatch(/cpf|ssn|date.?of.?birth|phone.?number/i);
    }
  });
});
