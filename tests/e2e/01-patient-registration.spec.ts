/**
 * E2E Test: Patient Registration Workflow
 *
 * Critical Path: Clinician creates new patient record
 *
 * Success Criteria:
 * - Patient created with all required fields
 * - MRN auto-generated
 * - Audit log created (LGPD Art. 37)
 * - Patient appears in patient list
 */

import { test, expect } from '@playwright/test';

test.describe('Patient Registration', () => {
  test.beforeEach(async ({ page }) => {
    // Login as clinician
    await page.goto('/login');
    await page.fill('input[name="email"]', 'clinician@holilabs.com');
    await page.fill('input[name="password"]', 'test-password');
    await page.click('button:has-text("Sign In")');

    // Wait for dashboard to load
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should create new patient with required fields', async ({ page }) => {
    // Navigate to patient creation
    await page.goto('/dashboard/patients');
    await page.click('button:has-text("New Patient")');

    // Fill patient details
    const timestamp = Date.now();
    await page.fill('input[name="firstName"]', `João`);
    await page.fill('input[name="lastName"]', `Silva-${timestamp}`);
    await page.fill('input[name="email"]', `joao.silva.${timestamp}@example.com`);
    await page.fill('input[name="phone"]', '+55 11 98765-4321');
    await page.fill('input[name="birthDate"]', '1985-03-15');

    // Select gender
    await page.selectOption('select[name="gender"]', 'male');

    // Fill address (Brazil)
    await page.fill('input[name="address.line"]', 'Av. Paulista, 1000');
    await page.fill('input[name="address.city"]', 'São Paulo');
    await page.fill('input[name="address.state"]', 'SP');
    await page.fill('input[name="address.postalCode"]', '01310-100');
    await page.selectOption('select[name="address.country"]', 'BR');

    // Submit form
    await page.click('button:has-text("Create Patient")');

    // Verify success
    await expect(page.locator('text=Patient created successfully')).toBeVisible({ timeout: 5000 });

    // Verify redirect to patient detail page
    await expect(page).toHaveURL(/\/dashboard\/patients\/[a-z0-9-]+/);

    // Verify patient details are displayed
    await expect(page.locator('h1:has-text("João Silva")')).toBeVisible();

    // Verify MRN is auto-generated
    await expect(page.locator('text=/MRN: [A-Z0-9-]+/')).toBeVisible();

    // Verify basic info is displayed
    await expect(page.locator('text=+55 11 98765-4321')).toBeVisible();
    await expect(page.locator('text=São Paulo, SP')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/dashboard/patients');
    await page.click('button:has-text("New Patient")');

    // Try to submit without required fields
    await page.click('button:has-text("Create Patient")');

    // Verify validation errors
    await expect(page.locator('text=/First name.*required/i')).toBeVisible();
    await expect(page.locator('text=/Last name.*required/i')).toBeVisible();
    await expect(page.locator('text=/Birth date.*required/i')).toBeVisible();
  });

  test('should show patient in list after creation', async ({ page }) => {
    // Create patient
    await page.goto('/dashboard/patients');
    const initialCount = await page.locator('[data-testid="patient-row"]').count();

    await page.click('button:has-text("New Patient")');

    const timestamp = Date.now();
    await page.fill('input[name="firstName"]', 'Maria');
    await page.fill('input[name="lastName"]', `Santos-${timestamp}`);
    await page.fill('input[name="birthDate"]', '1990-07-22');
    await page.selectOption('select[name="gender"]', 'female');
    await page.click('button:has-text("Create Patient")');

    await expect(page.locator('text=Patient created successfully')).toBeVisible({ timeout: 5000 });

    // Go back to patient list
    await page.goto('/dashboard/patients');

    // Verify patient appears in list
    const newCount = await page.locator('[data-testid="patient-row"]').count();
    expect(newCount).toBe(initialCount + 1);

    await expect(page.locator(`text=Maria Santos-${timestamp}`)).toBeVisible();
  });

  test('should handle duplicate email validation', async ({ page }) => {
    const email = 'duplicate@example.com';

    // Create first patient
    await page.goto('/dashboard/patients/new');
    await page.fill('input[name="firstName"]', 'First');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="birthDate"]', '1988-01-01');
    await page.selectOption('select[name="gender"]', 'male');
    await page.click('button:has-text("Create Patient")');
    await expect(page.locator('text=Patient created successfully')).toBeVisible({ timeout: 5000 });

    // Try to create second patient with same email
    await page.goto('/dashboard/patients/new');
    await page.fill('input[name="firstName"]', 'Second');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="birthDate"]', '1992-01-01');
    await page.selectOption('select[name="gender"]', 'female');
    await page.click('button:has-text("Create Patient")');

    // Verify error
    await expect(page.locator('text=/Email.*already.*use/i')).toBeVisible();
  });

  test('should format Brazilian phone number', async ({ page }) => {
    await page.goto('/dashboard/patients/new');

    // Enter phone number without formatting
    await page.fill('input[name="phone"]', '11987654321');
    await page.blur('input[name="phone"]');

    // Verify auto-formatting to Brazilian format
    await expect(page.locator('input[name="phone"]')).toHaveValue(/\+55.*11.*98765-4321/);
  });

  test('should calculate age from birth date', async ({ page }) => {
    await page.goto('/dashboard/patients/new');

    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'Patient');
    await page.fill('input[name="birthDate"]', '2000-01-01');
    await page.selectOption('select[name="gender"]', 'male');
    await page.click('button:has-text("Create Patient")');

    await expect(page.locator('text=Patient created successfully')).toBeVisible({ timeout: 5000 });

    // Verify age is calculated and displayed (should be ~26 years in 2026)
    await expect(page.locator('text=/Age:.*2[456]/i')).toBeVisible();
  });
});
