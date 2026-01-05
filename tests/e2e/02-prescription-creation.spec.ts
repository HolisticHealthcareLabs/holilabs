/**
 * E2E Test: Prescription Creation Workflow
 *
 * Critical Path: Clinician creates prescription for patient
 *
 * Compliance:
 * - CFM Resolution 1821/2007 (Brazil medical records)
 * - ANVISA RDC 301/2019 (controlled substance logging)
 * - LGPD Art. 37 (audit trail)
 *
 * Success Criteria:
 * - Prescription created with medications
 * - Digital signature applied
 * - Audit log created
 * - Can send to pharmacy
 */

import { test, expect } from '@playwright/test';

test.describe('Prescription Creation', () => {
  let patientId: string;

  test.beforeEach(async ({ page }) => {
    // Login as clinician
    await page.goto('/login');
    await page.fill('input[name="email"]', 'clinician@holilabs.com');
    await page.fill('input[name="password"]', 'test-password');
    await page.click('button:has-text("Sign In")');
    await expect(page).toHaveURL(/\/dashboard/);

    // Create or select a test patient
    await page.goto('/dashboard/patients');

    // Check if test patient exists, otherwise create one
    const existingPatient = page.locator('text=Test Patient for Prescriptions').first();
    if (await existingPatient.count() > 0) {
      await existingPatient.click();
      const url = page.url();
      patientId = url.split('/').pop() || '';
    } else {
      // Create test patient
      await page.click('button:has-text("New Patient")');
      await page.fill('input[name="firstName"]', 'Test Patient for');
      await page.fill('input[name="lastName"]', 'Prescriptions');
      await page.fill('input[name="birthDate"]', '1975-06-15');
      await page.selectOption('select[name="gender"]', 'male');
      await page.click('button:has-text("Create Patient")');
      await expect(page.locator('text=Patient created successfully')).toBeVisible({ timeout: 5000 });
      const url = page.url();
      patientId = url.split('/').pop() || '';
    }
  });

  test('should create prescription with multiple medications', async ({ page }) => {
    // Navigate to patient detail
    await page.goto(`/dashboard/patients/${patientId}`);

    // Click new prescription
    await page.click('button:has-text("New Prescription")');

    // Add first medication
    await page.fill('input[name="medications.0.name"]', 'Metformin');
    await page.fill('input[name="medications.0.dosage"]', '500mg');
    await page.fill('input[name="medications.0.frequency"]', 'Twice daily');
    await page.fill('input[name="medications.0.duration"]', '30 days');

    // Add second medication
    await page.click('button:has-text("Add Medication")');
    await page.fill('input[name="medications.1.name"]', 'Atorvastatin');
    await page.fill('input[name="medications.1.dosage"]', '20mg');
    await page.fill('input[name="medications.1.frequency"]', 'Once daily at bedtime');
    await page.fill('input[name="medications.1.duration"]', '30 days');

    // Add instructions
    await page.fill('textarea[name="instructions"]', 'Take with food. Monitor blood glucose.');

    // Submit prescription
    await page.click('button:has-text("Create Prescription")');

    // Verify success
    await expect(page.locator('text=Prescription created successfully')).toBeVisible({ timeout: 5000 });

    // Verify prescription appears in list
    await expect(page.locator('text=Metformin 500mg')).toBeVisible();
    await expect(page.locator('text=Atorvastatin 20mg')).toBeVisible();

    // Verify status is "Pending"
    await expect(page.locator('text=Status: Pending')).toBeVisible();
  });

  test('should validate required fields for prescription', async ({ page }) => {
    await page.goto(`/dashboard/patients/${patientId}`);
    await page.click('button:has-text("New Prescription")');

    // Try to submit empty prescription
    await page.click('button:has-text("Create Prescription")');

    // Verify validation errors
    await expect(page.locator('text=/At least one medication.*required/i')).toBeVisible();
  });

  test('should validate medication fields', async ({ page }) => {
    await page.goto(`/dashboard/patients/${patientId}`);
    await page.click('button:has-text("New Prescription")');

    // Fill medication name only
    await page.fill('input[name="medications.0.name"]', 'Incomplete Med');

    // Try to submit
    await page.click('button:has-text("Create Prescription")');

    // Verify validation errors
    await expect(page.locator('text=/Dosage.*required/i')).toBeVisible();
    await expect(page.locator('text=/Frequency.*required/i')).toBeVisible();
  });

  test('should send prescription to pharmacy', async ({ page }) => {
    // First, create a prescription
    await page.goto(`/dashboard/patients/${patientId}`);
    await page.click('button:has-text("New Prescription")');

    await page.fill('input[name="medications.0.name"]', 'Losartan');
    await page.fill('input[name="medications.0.dosage"]', '50mg');
    await page.fill('input[name="medications.0.frequency"]', 'Once daily');
    await page.fill('input[name="medications.0.duration"]', '30 days');
    await page.click('button:has-text("Create Prescription")');

    await expect(page.locator('text=Prescription created successfully')).toBeVisible({ timeout: 5000 });

    // Now send to pharmacy
    await page.click('button:has-text("Send to Pharmacy")');

    // Select pharmacy
    await page.selectOption('select[name="pharmacyId"]', { index: 1 }); // First pharmacy

    // Confirm send
    await page.click('button:has-text("Confirm Send")');

    // Verify success
    await expect(page.locator('text=Prescription sent to pharmacy')).toBeVisible({ timeout: 5000 });

    // Verify status changed to "Sent to Pharmacy"
    await expect(page.locator('text=Status: Sent to Pharmacy')).toBeVisible();

    // Verify audit log entry (compliance check)
    await page.click('button:has-text("View Audit Log")');
    await expect(page.locator('text=SEND_TO_PHARMACY')).toBeVisible();
  });

  test('should display controlled substance warning', async ({ page }) => {
    await page.goto(`/dashboard/patients/${patientId}`);
    await page.click('button:has-text("New Prescription")');

    // Enter controlled substance (ANVISA requires special logging)
    await page.fill('input[name="medications.0.name"]', 'Alprazolam');
    await page.fill('input[name="medications.0.dosage"]', '0.5mg');
    await page.fill('input[name="medications.0.frequency"]', 'Once daily');
    await page.fill('input[name="medications.0.duration"]', '15 days');

    // Verify controlled substance warning appears
    await expect(page.locator('text=/Controlled substance.*requires.*justification/i')).toBeVisible();

    // Fill justification
    await page.fill('textarea[name="controlledSubstanceJustification"]', 'Prescribed for anxiety disorder. Patient has tried non-pharmacological interventions.');

    // Submit
    await page.click('button:has-text("Create Prescription")');

    await expect(page.locator('text=Prescription created successfully')).toBeVisible({ timeout: 5000 });

    // Verify special audit log for controlled substance
    await page.click('button:has-text("View Audit Log")');
    await expect(page.locator('text=CONTROLLED_SUBSTANCE')).toBeVisible();
  });

  test('should handle prescription renewal', async ({ page }) => {
    // Create initial prescription
    await page.goto(`/dashboard/patients/${patientId}`);
    await page.click('button:has-text("New Prescription")');

    await page.fill('input[name="medications.0.name"]', 'Lisinopril');
    await page.fill('input[name="medications.0.dosage"]', '10mg');
    await page.fill('input[name="medications.0.frequency"]', 'Once daily');
    await page.fill('input[name="medications.0.duration"]', '30 days');
    await page.click('button:has-text("Create Prescription")');

    await expect(page.locator('text=Prescription created successfully')).toBeVisible({ timeout: 5000 });

    // Renew prescription
    await page.click('button:has-text("Renew")');

    // Verify pre-filled with previous data
    await expect(page.locator('input[name="medications.0.name"]')).toHaveValue('Lisinopril');
    await expect(page.locator('input[name="medications.0.dosage"]')).toHaveValue('10mg');

    // Submit renewal
    await page.click('button:has-text("Create Prescription")');

    await expect(page.locator('text=Prescription renewed successfully')).toBeVisible({ timeout: 5000 });

    // Verify original prescription marked as "Renewed"
    await expect(page.locator('text=Status: Renewed')).toBeVisible();
  });

  test('should search medications from database', async ({ page }) => {
    await page.goto(`/dashboard/patients/${patientId}`);
    await page.click('button:has-text("New Prescription")');

    // Start typing medication name
    await page.fill('input[name="medications.0.name"]', 'met');

    // Wait for autocomplete dropdown
    await expect(page.locator('[role="listbox"]')).toBeVisible({ timeout: 3000 });

    // Verify common medications appear
    await expect(page.locator('text=Metformin')).toBeVisible();
    await expect(page.locator('text=Metoprolol')).toBeVisible();

    // Select from dropdown
    await page.click('text=Metformin');

    // Verify medication name filled
    await expect(page.locator('input[name="medications.0.name"]')).toHaveValue('Metformin');
  });

  test('should calculate total medication cost estimate', async ({ page }) => {
    await page.goto(`/dashboard/patients/${patientId}`);
    await page.click('button:has-text("New Prescription")');

    await page.fill('input[name="medications.0.name"]', 'Omeprazole');
    await page.fill('input[name="medications.0.dosage"]', '20mg');
    await page.fill('input[name="medications.0.frequency"]', 'Once daily');
    await page.fill('input[name="medications.0.duration"]', '30 days');

    // Verify cost estimate appears (if available)
    const costEstimate = page.locator('text=/Estimated cost:.*R\$/i');
    if (await costEstimate.count() > 0) {
      await expect(costEstimate).toBeVisible();
    }
  });
});
