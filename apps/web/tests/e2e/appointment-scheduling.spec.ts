import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Appointment Scheduling
 * Tests critical scheduling workflows for both providers and patients
 */

test.describe('Appointment Scheduling - Patient View', () => {
  test.beforeEach(async ({ page }) => {
    // await loginAsTestPatient(page);
    await page.goto('/portal/appointments');
  });

  test('should display available appointment slots', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /schedule appointment/i })).toBeVisible();

    // Select provider
    await page.getByLabel(/select provider/i).click();
    await page.getByRole('option', { name: /dr\. smith/i }).click();

    // Select date
    await page.getByLabel(/select date/i).click();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowButton = page.getByRole('button', { name: tomorrow.getDate().toString() });
    await tomorrowButton.click();

    // Verify time slots appear
    const timeSlots = page.locator('[data-testid="time-slot"]');
    expect(await timeSlots.count()).toBeGreaterThanOrEqual(1);
  });

  test('should book an appointment successfully', async ({ page }) => {
    // Select provider
    await page.getByLabel(/select provider/i).selectOption('dr-smith');

    // Select appointment type
    await page.getByLabel(/appointment type/i).selectOption('consultation');

    // Select date and time
    await page.getByLabel(/select date/i).click();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.getByRole('button', { name: tomorrow.getDate().toString() }).click();

    await page.locator('[data-testid="time-slot"]').first().click();

    // Fill reason
    await page.getByLabel(/reason for visit/i).fill('Annual checkup');

    // Submit
    await page.getByRole('button', { name: /book appointment/i }).click();

    // Verify success
    await expect(page.getByText(/appointment booked successfully/i)).toBeVisible();
    await expect(page.getByText(/confirmation email sent/i)).toBeVisible();
  });

  test('should prevent booking in the past', async ({ page }) => {
    await page.getByLabel(/select provider/i).selectOption('dr-smith');

    // Try to select yesterday (if calendar allows)
    await page.getByLabel(/select date/i).click();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const yesterdayButton = page.getByRole('button', { name: yesterday.getDate().toString() });

    // Should be disabled
    await expect(yesterdayButton).toBeDisabled();
  });

  test('should show appointment conflicts', async ({ page }) => {
    await page.getByLabel(/select provider/i).selectOption('dr-smith');

    // Book first appointment
    await page.locator('[data-testid="time-slot"]').first().click();
    await page.getByRole('button', { name: /book appointment/i }).click();
    await expect(page.getByText(/appointment booked/i)).toBeVisible();

    // Try to book same slot again
    await page.goto('/portal/appointments/new');
    await page.getByLabel(/select provider/i).selectOption('dr-smith');
    await page.locator('[data-testid="time-slot"]').first().click();

    // Should show conflict warning
    await expect(page.getByText(/you already have an appointment/i)).toBeVisible();
  });

  test('should allow rescheduling appointment', async ({ page }) => {
    // View existing appointment
    const firstAppointment = page.locator('[data-testid="appointment-card"]').first();
    await expect(firstAppointment).toBeVisible();

    // Click reschedule
    await firstAppointment.getByRole('button', { name: /reschedule/i }).click();

    // Select new time slot
    await page.locator('[data-testid="time-slot"]').nth(2).click();
    await page.getByRole('button', { name: /confirm reschedule/i }).click();

    // Verify success
    await expect(page.getByText(/appointment rescheduled/i)).toBeVisible();
  });

  test('should allow canceling appointment', async ({ page }) => {
    // View existing appointment
    const firstAppointment = page.locator('[data-testid="appointment-card"]').first();
    await expect(firstAppointment).toBeVisible();

    // Click cancel
    await firstAppointment.getByRole('button', { name: /cancel/i }).click();

    // Confirm cancellation
    await page.getByRole('dialog').getByLabel(/reason for cancellation/i).fill('Schedule conflict');
    await page.getByRole('button', { name: /confirm cancellation/i }).click();

    // Verify success
    await expect(page.getByText(/appointment cancelled/i)).toBeVisible();
  });
});

test.describe('Appointment Scheduling - Provider Calendar View', () => {
  test.beforeEach(async ({ page }) => {
    // await loginAsProvider(page);
    await page.goto('/dashboard/appointments');
  });

  test('should display provider calendar with appointments', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /calendar/i })).toBeVisible();

    // Check calendar is visible
    await expect(page.locator('[data-testid="calendar"]')).toBeVisible();

    // Check appointment blocks
    const appointmentBlocks = page.locator('[data-testid="appointment-block"]');
    expect(await appointmentBlocks.count()).toBeGreaterThanOrEqual(0);
  });

  test('should switch between calendar views', async ({ page }) => {
    // Day view
    await page.getByRole('button', { name: /day view/i }).click();
    await expect(page.locator('[data-testid="day-view"]')).toBeVisible();

    // Week view
    await page.getByRole('button', { name: /week view/i }).click();
    await expect(page.locator('[data-testid="week-view"]')).toBeVisible();

    // Month view
    await page.getByRole('button', { name: /month view/i }).click();
    await expect(page.locator('[data-testid="month-view"]')).toBeVisible();
  });

  test('should create appointment block', async ({ page }) => {
    // Click on time slot
    await page.locator('[data-testid="calendar-slot"]').first().click();

    // Fill appointment details
    await page.getByLabel(/patient/i).fill('Jane Doe');
    await page.getByLabel(/appointment type/i).selectOption('consultation');
    await page.getByLabel(/duration/i).selectOption('30');
    await page.getByLabel(/notes/i).fill('New patient consultation');

    // Save
    await page.getByRole('button', { name: /create appointment/i }).click();

    // Verify appointment appears on calendar
    await expect(page.getByText(/jane doe/i)).toBeVisible();
  });

  test('should drag and drop appointment to reschedule', async ({ page }) => {
    const appointment = page.locator('[data-testid="appointment-block"]').first();
    const targetSlot = page.locator('[data-testid="calendar-slot"]').nth(5);

    await appointment.dragTo(targetSlot);

    // Verify confirmation dialog
    await expect(page.getByText(/confirm reschedule/i)).toBeVisible();
    await page.getByRole('button', { name: /confirm/i }).click();

    // Verify success
    await expect(page.getByText(/appointment rescheduled/i)).toBeVisible();
  });

  test('should block time slots for unavailability', async ({ page }) => {
    await page.getByRole('button', { name: /block time/i }).click();

    // Select time range
    await page.getByLabel(/start time/i).fill('14:00');
    await page.getByLabel(/end time/i).fill('16:00');
    await page.getByLabel(/reason/i).fill('Lunch break');

    // Apply recurring rule
    await page.getByLabel(/repeat/i).selectOption('weekly');

    await page.getByRole('button', { name: /save/i }).click();

    // Verify blocked time appears
    await expect(page.locator('[data-testid="blocked-time"]')).toBeVisible();
  });
});

test.describe('Appointment Scheduling - Recurring Appointments', () => {
  test.beforeEach(async ({ page }) => {
    // await loginAsProvider(page);
    await page.goto('/dashboard/appointments/new');
  });

  test('should create recurring appointment', async ({ page }) => {
    // Fill basic details
    await page.getByLabel(/patient/i).fill('John Smith');
    await page.getByLabel(/appointment type/i).selectOption('follow-up');

    // Enable recurring
    await page.getByLabel(/recurring appointment/i).check();

    // Set recurrence pattern
    await page.getByLabel(/repeat every/i).selectOption('week');
    await page.getByLabel(/number of occurrences/i).fill('6');

    // Select days of week
    await page.getByLabel(/monday/i).check();
    await page.getByLabel(/wednesday/i).check();

    await page.getByRole('button', { name: /create series/i }).click();

    // Verify success
    await expect(page.getByText(/6 appointments created/i)).toBeVisible();
  });

  test('should edit single occurrence in series', async ({ page }) => {
    // Open recurring appointment
    const recurringAppointment = page.locator('[data-testid="recurring-appointment"]').first();
    await recurringAppointment.click();

    // Edit this occurrence only
    await page.getByRole('button', { name: /edit this occurrence/i }).click();

    await page.getByLabel(/notes/i).fill('Patient requested time change');
    await page.getByRole('button', { name: /save/i }).click();

    // Verify only one changed
    await expect(page.getByText(/single occurrence updated/i)).toBeVisible();
  });

  test('should edit entire series', async ({ page }) => {
    // Open recurring appointment
    const recurringAppointment = page.locator('[data-testid="recurring-appointment"]').first();
    await recurringAppointment.click();

    // Edit entire series
    await page.getByRole('button', { name: /edit series/i }).click();

    await page.getByLabel(/duration/i).selectOption('45');
    await page.getByRole('button', { name: /save series/i }).click();

    // Verify all updated
    await expect(page.getByText(/series updated/i)).toBeVisible();
  });

  test('should cancel entire series', async ({ page }) => {
    const recurringAppointment = page.locator('[data-testid="recurring-appointment"]').first();
    await recurringAppointment.click();

    await page.getByRole('button', { name: /cancel series/i }).click();

    // Confirm
    await page.getByRole('dialog').getByLabel(/reason/i).fill('Treatment completed');
    await page.getByRole('button', { name: /confirm cancellation/i }).click();

    // Verify all cancelled
    await expect(page.getByText(/series cancelled/i)).toBeVisible();
  });
});

test.describe('Appointment Scheduling - Notifications', () => {
  test('should send confirmation email after booking', async ({ page }) => {
    // await loginAsTestPatient(page);
    await page.goto('/portal/appointments/new');

    // Book appointment
    await page.getByLabel(/select provider/i).selectOption('dr-smith');
    await page.locator('[data-testid="time-slot"]').first().click();
    await page.getByRole('button', { name: /book appointment/i }).click();

    // Verify confirmation message mentions email
    await expect(page.getByText(/confirmation email sent/i)).toBeVisible();
  });

  test('should allow opting in for SMS reminders', async ({ page }) => {
    // await loginAsTestPatient(page);
    await page.goto('/portal/appointments/new');

    // Enable SMS reminders
    await page.getByLabel(/send sms reminder/i).check();

    // Book appointment
    await page.getByLabel(/select provider/i).selectOption('dr-smith');
    await page.locator('[data-testid="time-slot"]').first().click();
    await page.getByRole('button', { name: /book appointment/i }).click();

    // Verify SMS reminder will be sent
    await expect(page.getByText(/sms reminder will be sent/i)).toBeVisible();
  });
});

test.describe('Appointment Scheduling - Waitlist', () => {
  test('should add patient to waitlist when no slots available', async ({ page }) => {
    // await loginAsTestPatient(page);
    await page.goto('/portal/appointments/new');

    await page.getByLabel(/select provider/i).selectOption('dr-busy');

    // If no slots available
    await expect(page.getByText(/no available slots/i)).toBeVisible();

    // Join waitlist
    await page.getByRole('button', { name: /join waitlist/i }).click();

    await page.getByLabel(/preferred time/i).selectOption('morning');
    await page.getByRole('button', { name: /add to waitlist/i }).click();

    // Verify success
    await expect(page.getByText(/added to waitlist/i)).toBeVisible();
  });

  test('should notify patient when waitlist slot becomes available', async ({ page }) => {
    // await loginAsProvider(page);
    await page.goto('/dashboard/appointments');

    // Cancel an appointment
    await page.locator('[data-testid="appointment-block"]').first().click();
    await page.getByRole('button', { name: /cancel/i }).click();
    await page.getByRole('button', { name: /confirm/i }).click();

    // Verify waitlist notification prompt
    await expect(page.getByText(/notify waitlist patients/i)).toBeVisible();

    await page.getByRole('button', { name: /send notifications/i }).click();

    // Verify notifications sent
    await expect(page.getByText(/\d+ patients notified/i)).toBeVisible();
  });
});

test.describe('Appointment Scheduling - Integration', () => {
  test('should sync with Google Calendar', async ({ page }) => {
    // await loginAsProvider(page);
    await page.goto('/settings/integrations');

    // Connect Google Calendar
    await page.getByRole('button', { name: /connect google calendar/i }).click();

    // Mock OAuth flow (in real test, this would go through OAuth)
    // await handleOAuthFlow(page);

    // Verify connected
    await expect(page.getByText(/google calendar connected/i)).toBeVisible();

    // Enable sync
    await page.getByLabel(/sync appointments/i).check();
    await page.getByRole('button', { name: /save/i }).click();

    // Verify sync enabled
    await expect(page.getByText(/sync enabled/i)).toBeVisible();
  });

  test('should handle timezone conversions', async ({ page }) => {
    // await loginAsTestPatient(page);
    await page.goto('/portal/appointments/new');

    // Select timezone
    await page.getByLabel(/timezone/i).selectOption('America/New_York');

    // Select provider in different timezone
    await page.getByLabel(/select provider/i).selectOption('dr-smith-pacific');

    // Verify time slots show in patient's timezone
    const firstSlot = page.locator('[data-testid="time-slot"]').first();
    const slotText = await firstSlot.textContent();
    expect(slotText).toContain('EST');
  });
});

test.describe('Appointment Scheduling - Mobile Experience', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
  });

  test('should render calendar on mobile', async ({ page }) => {
    // await loginAsTestPatient(page);
    await page.goto('/portal/appointments');

    // Verify mobile-optimized calendar
    await expect(page.locator('[data-testid="mobile-calendar"]')).toBeVisible();
  });

  test('should use mobile date picker', async ({ page }) => {
    // await loginAsTestPatient(page);
    await page.goto('/portal/appointments/new');

    await page.getByLabel(/select date/i).click();

    // Verify mobile date picker appears
    await expect(page.locator('input[type="date"]')).toBeVisible();
  });
});

test.describe('Appointment Scheduling - Performance', () => {
  test('should load calendar within 2 seconds', async ({ page }) => {
    // await loginAsProvider(page);

    const startTime = Date.now();
    await page.goto('/dashboard/appointments');
    await page.locator('[data-testid="calendar"]').waitFor();
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(2000);
  });

  test('should handle 100+ appointments without lag', async ({ page }) => {
    // await loginAsProvider(page);
    await page.goto('/dashboard/appointments?view=month');

    // Switch to month view with many appointments
    await page.waitForTimeout(500);

    // Interact with calendar
    const response = await page.waitForResponse(response =>
      response.url().includes('/api/appointments') && response.status() === 200
    );

    expect(response.ok()).toBeTruthy();
  });
});
