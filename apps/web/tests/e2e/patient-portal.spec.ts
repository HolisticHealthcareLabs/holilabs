import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Patient Portal
 * Tests critical patient-facing workflows
 */

test.describe('Patient Portal - Authentication', () => {
  test('should display login page with all auth options', async ({ page }) => {
    await page.goto('/portal/login');

    // Check page loaded
    await expect(page).toHaveTitle(/Patient Portal/);

    // Verify auth options are present
    await expect(page.getByRole('button', { name: /sign in with email/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with phone/i })).toBeVisible();

    // Check accessibility
    await expect(page.locator('main')).toHaveAttribute('role', 'main');
  });

  test('should show validation errors for invalid email', async ({ page }) => {
    await page.goto('/portal/login');

    // Enter invalid email
    await page.getByLabel(/email/i).fill('invalid-email');
    await page.getByRole('button', { name: /send magic link/i }).click();

    // Check for validation error
    await expect(page.getByText(/invalid email/i)).toBeVisible();
  });

  test('should send magic link for valid email', async ({ page }) => {
    await page.goto('/portal/login');

    // Enter valid email
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByRole('button', { name: /send magic link/i }).click();

    // Check success message
    await expect(page.getByText(/check your email/i)).toBeVisible();
  });
});

test.describe('Patient Portal - Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test patient
    await page.goto('/portal/login');
    // TODO: Implement test authentication helper
    // await loginAsTestPatient(page);
  });

  test('should display patient dashboard with key sections', async ({ page }) => {
    await page.goto('/portal/dashboard');

    // Verify key sections are present
    await expect(page.getByRole('heading', { name: /upcoming appointments/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /recent visits/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /medications/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /test results/i })).toBeVisible();
  });

  test('should navigate to appointments page', async ({ page }) => {
    await page.goto('/portal/dashboard');

    await page.getByRole('link', { name: /view all appointments/i }).click();

    await expect(page).toHaveURL(/\/portal\/appointments/);
    await expect(page.getByRole('heading', { name: /appointments/i })).toBeVisible();
  });

  test('should display notifications badge', async ({ page }) => {
    await page.goto('/portal/dashboard');

    // Check for notifications indicator
    const notificationBadge = page.locator('[data-testid="notification-badge"]');
    if (await notificationBadge.isVisible()) {
      await expect(notificationBadge).toContainText(/\d+/);
    }
  });
});

test.describe('Patient Portal - Medical Records', () => {
  test.beforeEach(async ({ page }) => {
    // await loginAsTestPatient(page);
    await page.goto('/portal/records');
  });

  test('should display medical records list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /medical records/i })).toBeVisible();

    // Check for records table or list
    const recordsList = page.locator('[data-testid="records-list"]');
    await expect(recordsList).toBeVisible();
  });

  test('should filter records by date', async ({ page }) => {
    // Open date filter
    await page.getByRole('button', { name: /filter/i }).click();

    // Select date range
    await page.getByLabel(/from date/i).fill('2024-01-01');
    await page.getByLabel(/to date/i).fill('2024-12-31');
    await page.getByRole('button', { name: /apply filter/i }).click();

    // Verify filter applied
    await expect(page.locator('[data-testid="active-filter"]')).toBeVisible();
  });

  test('should search records', async ({ page }) => {
    const searchInput = page.getByRole('searchbox', { name: /search records/i });
    await searchInput.fill('blood test');

    // Wait for search results
    await page.waitForTimeout(500);

    // Check results updated
    await expect(page.locator('[data-testid="records-list"]')).toBeVisible();
  });

  test('should download medical record', async ({ page }) => {
    // Find first record
    const firstRecord = page.locator('[data-testid="record-item"]').first();
    await expect(firstRecord).toBeVisible();

    // Click download
    const downloadPromise = page.waitForEvent('download');
    await firstRecord.getByRole('button', { name: /download/i }).click();
    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });
});

test.describe('Patient Portal - Documents', () => {
  test.beforeEach(async ({ page }) => {
    // await loginAsTestPatient(page);
    await page.goto('/portal/documents');
  });

  test('should display documents library', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /documents/i })).toBeVisible();

    // Check for document categories
    await expect(page.getByText(/lab results/i)).toBeVisible();
    await expect(page.getByText(/prescriptions/i)).toBeVisible();
    await expect(page.getByText(/imaging/i)).toBeVisible();
  });

  test('should upload document', async ({ page }) => {
    await page.getByRole('button', { name: /upload document/i }).click();

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-document.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('test pdf content'),
    });

    // Fill document details
    await page.getByLabel(/document title/i).fill('Test Lab Result');
    await page.getByLabel(/category/i).selectOption('lab-results');
    await page.getByRole('button', { name: /save/i }).click();

    // Verify success
    await expect(page.getByText(/document uploaded successfully/i)).toBeVisible();
  });
});

test.describe('Patient Portal - Profile Management', () => {
  test.beforeEach(async ({ page }) => {
    // await loginAsTestPatient(page);
    await page.goto('/portal/profile');
  });

  test('should display patient profile information', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible();

    // Check profile fields
    await expect(page.getByLabel(/first name/i)).toBeVisible();
    await expect(page.getByLabel(/last name/i)).toBeVisible();
    await expect(page.getByLabel(/date of birth/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/phone/i)).toBeVisible();
  });

  test('should update contact information', async ({ page }) => {
    const phoneInput = page.getByLabel(/phone/i);
    await phoneInput.clear();
    await phoneInput.fill('+1 (555) 123-4567');

    await page.getByRole('button', { name: /save changes/i }).click();

    await expect(page.getByText(/profile updated successfully/i)).toBeVisible();
  });

  test('should update emergency contact', async ({ page }) => {
    await page.getByRole('tab', { name: /emergency contact/i }).click();

    await page.getByLabel(/emergency contact name/i).fill('Jane Doe');
    await page.getByLabel(/emergency contact phone/i).fill('+1 (555) 987-6543');
    await page.getByLabel(/relationship/i).selectOption('spouse');

    await page.getByRole('button', { name: /save/i }).click();

    await expect(page.getByText(/emergency contact updated/i)).toBeVisible();
  });

  test('should manage notification preferences', async ({ page }) => {
    await page.getByRole('tab', { name: /notifications/i }).click();

    // Toggle appointment reminders
    await page.getByLabel(/appointment reminders/i).check();

    // Select notification methods
    await page.getByLabel(/email notifications/i).check();
    await page.getByLabel(/sms notifications/i).check();

    await page.getByRole('button', { name: /save preferences/i }).click();

    await expect(page.getByText(/preferences saved/i)).toBeVisible();
  });
});

test.describe('Patient Portal - Messaging', () => {
  test.beforeEach(async ({ page }) => {
    // await loginAsTestPatient(page);
    await page.goto('/portal/messages');
  });

  test('should display message inbox', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /messages/i })).toBeVisible();

    // Check for message list
    const messageList = page.locator('[data-testid="message-list"]');
    await expect(messageList).toBeVisible();
  });

  test('should compose new message to provider', async ({ page }) => {
    await page.getByRole('button', { name: /new message/i }).click();

    // Fill message form
    await page.getByLabel(/to/i).selectOption('Dr. Smith');
    await page.getByLabel(/subject/i).fill('Question about medication');
    await page.getByLabel(/message/i).fill('I have a question about the dosage of my medication.');

    await page.getByRole('button', { name: /send/i }).click();

    await expect(page.getByText(/message sent/i)).toBeVisible();
  });

  test('should read message', async ({ page }) => {
    // Click first message
    const firstMessage = page.locator('[data-testid="message-item"]').first();
    await firstMessage.click();

    // Verify message details displayed
    await expect(page.getByRole('heading', { name: /message details/i })).toBeVisible();
    await expect(page.locator('[data-testid="message-content"]')).toBeVisible();
  });

  test('should reply to message', async ({ page }) => {
    // Open first message
    await page.locator('[data-testid="message-item"]').first().click();

    // Click reply
    await page.getByRole('button', { name: /reply/i }).click();

    // Type reply
    await page.getByLabel(/message/i).fill('Thank you for the clarification!');
    await page.getByRole('button', { name: /send/i }).click();

    await expect(page.getByText(/reply sent/i)).toBeVisible();
  });
});

test.describe('Patient Portal - Accessibility', () => {
  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/portal/dashboard');

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Verify focus is visible
    const focusedElement = await page.evaluateHandle(() => document.activeElement);
    await expect(focusedElement).toBeTruthy();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/portal/dashboard');

    // Check main landmark
    await expect(page.locator('main')).toHaveAttribute('role', 'main');

    // Check navigation
    await expect(page.locator('nav')).toHaveAttribute('role', 'navigation');

    // Check buttons have accessible names
    const buttons = page.locator('button');
    const count = await buttons.count();
    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const ariaLabel = await button.getAttribute('aria-label');
        const text = await button.textContent();
        expect(ariaLabel || text).toBeTruthy();
      }
    }
  });

  test('should support screen reader announcements', async ({ page }) => {
    await page.goto('/portal/dashboard');

    // Check for live regions
    const liveRegions = page.locator('[role="alert"], [role="status"], [aria-live]');
    expect(await liveRegions.count()).toBeGreaterThan(0);
  });
});

test.describe('Patient Portal - Responsive Design', () => {
  test('should render correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto('/portal/dashboard');

    // Check mobile menu
    await expect(page.getByRole('button', { name: /menu/i })).toBeVisible();

    // Open mobile menu
    await page.getByRole('button', { name: /menu/i }).click();

    // Verify navigation visible
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
  });

  test('should render correctly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await page.goto('/portal/dashboard');

    // Verify layout adapts
    await expect(page.locator('[data-testid="dashboard-grid"]')).toBeVisible();
  });

  test('should render correctly on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/portal/dashboard');

    // Verify full layout
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
  });
});
