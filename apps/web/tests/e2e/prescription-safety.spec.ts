import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Prescription Safety
 * Critical clinical safety checks for medication ordering
 */

test.describe('Prescription Safety - Allergy Checking', () => {
  test.beforeEach(async ({ page }) => {
    // await loginAsProvider(page);
    await page.goto('/dashboard/patients/PT-001/prescriptions/new');
  });

  test('should block prescription for documented drug allergy', async ({ page }) => {
    // Patient has documented penicillin allergy
    await expect(page.getByText(/allergies.*penicillin/i)).toBeVisible();

    // Try to prescribe amoxicillin (penicillin-based)
    await page.getByLabel(/medication name/i).fill('amoxicillin');
    await page.getByRole('option', { name: /amoxicillin 500mg/i }).click();

    // Verify allergy alert appears
    const allergyAlert = page.locator('[data-testid="allergy-alert"]');
    await expect(allergyAlert).toBeVisible();
    await expect(allergyAlert).toHaveClass(/alert-danger|bg-red/);
    await expect(allergyAlert).toContainText(/allergy.*penicillin/i);

    // Verify prescription button is disabled or requires override
    const prescribeButton = page.getByRole('button', { name: /prescribe|order/i });
    await expect(prescribeButton).toBeDisabled();
  });

  test('should require allergy override with documentation', async ({ page }) => {
    // Try to prescribe medication with known allergy
    await page.getByLabel(/medication name/i).fill('amoxicillin');
    await page.getByRole('option', { name: /amoxicillin 500mg/i }).click();

    // Allergy alert should appear
    await expect(page.locator('[data-testid="allergy-alert"]')).toBeVisible();

    // Click override
    await page.getByRole('button', { name: /override allergy/i }).click();

    // Should require justification
    const justificationDialog = page.getByRole('dialog', { name: /override/i });
    await expect(justificationDialog).toBeVisible();

    await justificationDialog.getByLabel(/reason/i).fill('Patient tolerated in past despite documented allergy');
    await justificationDialog.getByLabel(/attending physician approval/i).check();

    // Confirm override
    await justificationDialog.getByRole('button', { name: /confirm override/i }).click();

    // Verify prescription can now proceed
    await expect(page.getByRole('button', { name: /prescribe/i })).toBeEnabled();

    // Verify override is logged
    await expect(page.getByText(/allergy override documented/i)).toBeVisible();
  });

  test('should show cross-allergy warnings', async ({ page }) => {
    // Patient allergic to penicillin
    // Try to prescribe cephalosporin (cross-reactivity)
    await page.getByLabel(/medication name/i).fill('cephalexin');
    await page.getByRole('option', { name: /cephalexin 500mg/i }).click();

    // Should show cross-allergy warning
    const crossAllergyWarning = page.locator('[data-testid="cross-allergy-warning"]');
    await expect(crossAllergyWarning).toBeVisible();
    await expect(crossAllergyWarning).toContainText(/cross.*allergy.*penicillin/i);
    await expect(crossAllergyWarning).toContainText(/10%.*risk/i);
  });

  test('should check allergies against inactive ingredients', async ({ page }) => {
    // Patient allergic to lactose
    // Try to prescribe medication with lactose excipient
    await page.getByLabel(/medication name/i).fill('metformin');
    await page.getByRole('option', { name: /metformin.*lactose/i }).click();

    // Should warn about excipient allergy
    await expect(page.getByText(/inactive ingredient.*lactose/i)).toBeVisible();
  });
});

test.describe('Prescription Safety - Drug-Drug Interactions', () => {
  test.beforeEach(async ({ page }) => {
    // await loginAsProvider(page);
    // Patient on warfarin
    await page.goto('/dashboard/patients/PT-002/prescriptions/new');
  });

  test('should detect critical drug-drug interaction', async ({ page }) => {
    // Patient on warfarin
    await expect(page.getByText(/current medications.*warfarin/i)).toBeVisible();

    // Try to prescribe aspirin (bleeding risk)
    await page.getByLabel(/medication name/i).fill('aspirin');
    await page.getByRole('option', { name: /aspirin 325mg/i }).click();

    // Verify critical interaction alert
    const interactionAlert = page.locator('[data-testid="interaction-alert"]');
    await expect(interactionAlert).toBeVisible();
    await expect(interactionAlert).toHaveClass(/alert-danger|bg-red/);
    await expect(interactionAlert).toContainText(/critical.*interaction/i);
    await expect(interactionAlert).toContainText(/warfarin.*aspirin/i);
    await expect(interactionAlert).toContainText(/bleeding.*risk/i);

    // Verify clinical guidance
    await expect(interactionAlert).toContainText(/monitor INR/i);
  });

  test('should show severity levels for interactions', async ({ page }) => {
    // Try to prescribe medication with moderate interaction
    await page.getByLabel(/medication name/i).fill('amiodarone');
    await page.getByRole('option', { name: /amiodarone/i }).click();

    const interactionAlert = page.locator('[data-testid="interaction-alert"]');
    await expect(interactionAlert).toBeVisible();

    // Check severity indicator
    const severityBadge = interactionAlert.locator('[data-testid="severity-badge"]');
    await expect(severityBadge).toBeVisible();
    await expect(severityBadge).toHaveText(/major|severe|critical/i);
  });

  test('should provide clinical recommendations for interactions', async ({ page }) => {
    await page.getByLabel(/medication name/i).fill('nsaid');
    await page.getByRole('option', { name: /ibuprofen/i }).click();

    const interactionAlert = page.locator('[data-testid="interaction-alert"]');
    await expect(interactionAlert).toBeVisible();

    // Check for recommendations
    await expect(interactionAlert).toContainText(/recommendation/i);
    await expect(interactionAlert).toContainText(/consider alternative|monitor|avoid/i);

    // Check for references
    await expect(interactionAlert).toContainText(/source|reference/i);
  });

  test('should check interactions with multiple active medications', async ({ page }) => {
    // Patient on warfarin, metoprolol, lisinopril

    // Try to add diltiazem (interacts with both warfarin and metoprolol)
    await page.getByLabel(/medication name/i).fill('diltiazem');
    await page.getByRole('option', { name: /diltiazem/i }).click();

    // Should show multiple interactions
    const interactions = page.locator('[data-testid="interaction-item"]');
    expect(await interactions.count()).toBeGreaterThanOrEqual(2);

    // Verify each interaction is documented
    await expect(page.getByText(/diltiazem.*warfarin/i)).toBeVisible();
    await expect(page.getByText(/diltiazem.*metoprolol/i)).toBeVisible();
  });
});

test.describe('Prescription Safety - Dosage Validation', () => {
  test.beforeEach(async ({ page }) => {
    // await loginAsProvider(page);
    await page.goto('/dashboard/patients/PT-003/prescriptions/new');
  });

  test('should validate dosage against maximum daily dose', async ({ page }) => {
    await page.getByLabel(/medication name/i).fill('acetaminophen');
    await page.getByRole('option', { name: /acetaminophen 500mg/i }).click();

    // Enter excessive dosage
    await page.getByLabel(/dose/i).fill('1000');
    await page.getByLabel(/frequency/i).selectOption('q4h'); // Every 4 hours = 6x daily

    // Should show overdose warning (6000mg > 4000mg max)
    const dosageAlert = page.locator('[data-testid="dosage-alert"]');
    await expect(dosageAlert).toBeVisible();
    await expect(dosageAlert).toContainText(/exceeds maximum.*4000.*mg/i);
  });

  test('should validate pediatric dosing by weight', async ({ page }) => {
    // Pediatric patient, 20kg
    await page.goto('/dashboard/patients/PT-PEDS-001/prescriptions/new');

    await page.getByLabel(/medication name/i).fill('amoxicillin');
    await page.getByRole('option', { name: /amoxicillin suspension/i }).click();

    // Enter dose
    await page.getByLabel(/dose/i).fill('500');
    await page.getByLabel(/unit/i).selectOption('mg');

    // Should show pediatric dosing alert (25mg/kg recommended)
    const pediatricAlert = page.locator('[data-testid="pediatric-dosing-alert"]');
    await expect(pediatricAlert).toBeVisible();
    await expect(pediatricAlert).toContainText(/recommended.*20kg.*patient/i);
    await expect(pediatricAlert).toContainText(/500mg.*exceeds/i);
  });

  test('should provide dosing calculator for complex medications', async ({ page }) => {
    await page.getByLabel(/medication name/i).fill('warfarin');
    await page.getByRole('option', { name: /warfarin/i }).click();

    // Should show dosing calculator
    await page.getByRole('button', { name: /dosing calculator/i }).click();

    const calculator = page.getByRole('dialog', { name: /calculator/i });
    await expect(calculator).toBeVisible();

    // Enter patient parameters
    await calculator.getByLabel(/indication/i).selectOption('atrial-fibrillation');
    await calculator.getByLabel(/target INR/i).fill('2.5');
    await calculator.getByLabel(/current INR/i).fill('1.2');

    await calculator.getByRole('button', { name: /calculate/i }).click();

    // Should provide recommendation
    await expect(calculator.getByText(/recommended dose/i)).toBeVisible();
    await expect(calculator.getByText(/\d+\.?\d*\s*mg/i)).toBeVisible();
  });

  test('should validate renal dosing adjustments', async ({ page }) => {
    // Patient with renal impairment (CrCl 30 mL/min)
    await page.goto('/dashboard/patients/PT-RENAL-001/prescriptions/new');

    await page.getByLabel(/medication name/i).fill('enoxaparin');
    await page.getByRole('option', { name: /enoxaparin/i }).click();

    // Should show renal dosing alert
    const renalAlert = page.locator('[data-testid="renal-dosing-alert"]');
    await expect(renalAlert).toBeVisible();
    await expect(renalAlert).toContainText(/renal impairment.*30.*ml\/min/i);
    await expect(renalAlert).toContainText(/dose adjustment required/i);
  });

  test('should validate hepatic dosing adjustments', async ({ page }) => {
    // Patient with hepatic impairment
    await page.goto('/dashboard/patients/PT-HEPATIC-001/prescriptions/new');

    await page.getByLabel(/medication name/i).fill('atorvastatin');
    await page.getByRole('option', { name: /atorvastatin/i }).click();

    // Should show hepatic dosing alert
    const hepaticAlert = page.locator('[data-testid="hepatic-dosing-alert"]');
    await expect(hepaticAlert).toBeVisible();
    await expect(hepaticAlert).toContainText(/hepatic impairment/i);
    await expect(hepaticAlert).toContainText(/caution|contraindicated|reduce dose/i);
  });
});

test.describe('Prescription Safety - Age-Specific Considerations', () => {
  test('should flag Beers Criteria medications for elderly', async ({ page }) => {
    // await loginAsProvider(page);
    // Elderly patient, 82 years old
    await page.goto('/dashboard/patients/PT-ELDERLY-001/prescriptions/new');

    // Try to prescribe benzodiazepine
    await page.getByLabel(/medication name/i).fill('diazepam');
    await page.getByRole('option', { name: /diazepam/i }).click();

    // Should show Beers Criteria warning
    const beersAlert = page.locator('[data-testid="beers-criteria-alert"]');
    await expect(beersAlert).toBeVisible();
    await expect(beersAlert).toContainText(/beers criteria/i);
    await expect(beersAlert).toContainText(/potentially inappropriate.*elderly/i);
    await expect(beersAlert).toContainText(/increased.*fall.*risk/i);
  });

  test('should warn about pregnancy category', async ({ page }) => {
    // Pregnant patient
    await page.goto('/dashboard/patients/PT-PREGNANT-001/prescriptions/new');

    // Try to prescribe category X medication
    await page.getByLabel(/medication name/i).fill('isotretinoin');
    await page.getByRole('option', { name: /isotretinoin/i }).click();

    // Should show pregnancy warning
    const pregnancyAlert = page.locator('[data-testid="pregnancy-alert"]');
    await expect(pregnancyAlert).toBeVisible();
    await expect(pregnancyAlert).toHaveClass(/alert-danger|bg-red/);
    await expect(pregnancyAlert).toContainText(/category X.*contraindicated/i);
    await expect(pregnancyAlert).toContainText(/teratogenic/i);

    // Should block prescription
    await expect(page.getByRole('button', { name: /prescribe/i })).toBeDisabled();
  });

  test('should check lactation safety', async ({ page }) => {
    // Breastfeeding patient
    await page.goto('/dashboard/patients/PT-LACTATING-001/prescriptions/new');

    await page.getByLabel(/medication name/i).fill('codeine');
    await page.getByRole('option', { name: /codeine/i }).click();

    // Should show lactation warning
    const lactationAlert = page.locator('[data-testid="lactation-alert"]');
    await expect(lactationAlert).toBeVisible();
    await expect(lactationAlert).toContainText(/breastfeeding/i);
    await expect(lactationAlert).toContainText(/not recommended|caution/i);
  });
});

test.describe('Prescription Safety - Duplicate Therapy', () => {
  test('should detect duplicate medications', async ({ page }) => {
    // await loginAsProvider(page);
    // Patient already on lisinopril
    await page.goto('/dashboard/patients/PT-004/prescriptions/new');

    await expect(page.getByText(/current medications.*lisinopril/i)).toBeVisible();

    // Try to prescribe lisinopril again
    await page.getByLabel(/medication name/i).fill('lisinopril');
    await page.getByRole('option', { name: /lisinopril 10mg/i }).click();

    // Should show duplicate warning
    const duplicateAlert = page.locator('[data-testid="duplicate-alert"]');
    await expect(duplicateAlert).toBeVisible();
    await expect(duplicateAlert).toContainText(/already prescribed|duplicate/i);
    await expect(duplicateAlert).toContainText(/lisinopril/i);
  });

  test('should detect therapeutic duplication', async ({ page }) => {
    // Patient on lisinopril (ACE inhibitor)
    await page.goto('/dashboard/patients/PT-004/prescriptions/new');

    // Try to add losartan (ARB) - similar mechanism
    await page.getByLabel(/medication name/i).fill('losartan');
    await page.getByRole('option', { name: /losartan/i }).click();

    // Should show therapeutic duplication warning
    const therapeuticDupeAlert = page.locator('[data-testid="therapeutic-duplication-alert"]');
    await expect(therapeuticDupeAlert).toBeVisible();
    await expect(therapeuticDupeAlert).toContainText(/therapeutic duplication/i);
    await expect(therapeuticDupeAlert).toContainText(/ACE inhibitor.*ARB/i);
  });

  test('should detect duplicate drug classes', async ({ page }) => {
    // Patient on ibuprofen
    await page.goto('/dashboard/patients/PT-005/prescriptions/new');

    // Try to add naproxen (both NSAIDs)
    await page.getByLabel(/medication name/i).fill('naproxen');
    await page.getByRole('option', { name: /naproxen/i }).click();

    // Should show drug class duplication
    await expect(page.getByText(/multiple.*NSAID/i)).toBeVisible();
    await expect(page.getByText(/increased.*GI.*bleeding/i)).toBeVisible();
  });
});

test.describe('Prescription Safety - E-Prescribing Workflow', () => {
  test('should validate DEA number for controlled substances', async ({ page }) => {
    // await loginAsProvider(page);
    await page.goto('/dashboard/patients/PT-006/prescriptions/new');

    // Try to prescribe Schedule II controlled substance
    await page.getByLabel(/medication name/i).fill('oxycodone');
    await page.getByRole('option', { name: /oxycodone 5mg/i }).click();

    // Should require DEA verification
    const deaVerification = page.locator('[data-testid="dea-verification"]');
    await expect(deaVerification).toBeVisible();
    await expect(deaVerification).toContainText(/controlled substance.*schedule II/i);

    // Should show provider DEA number
    await expect(page.getByText(/DEA.*[A-Z]{2}\d{7}/i)).toBeVisible();
  });

  test('should enforce quantity limits for controlled substances', async ({ page }) => {
    // await loginAsProvider(page);
    await page.goto('/dashboard/patients/PT-006/prescriptions/new');

    await page.getByLabel(/medication name/i).fill('hydrocodone');
    await page.getByRole('option', { name: /hydrocodone/i }).click();

    // Try to prescribe excessive quantity
    await page.getByLabel(/quantity/i).fill('500');

    // Should show quantity limit warning
    const quantityAlert = page.locator('[data-testid="quantity-limit-alert"]');
    await expect(quantityAlert).toBeVisible();
    await expect(quantityAlert).toContainText(/exceeds.*limit/i);
    await expect(quantityAlert).toContainText(/max.*90.*day/i);
  });

  test('should check PDMP before opioid prescription', async ({ page }) => {
    // await loginAsProvider(page);
    await page.goto('/dashboard/patients/PT-007/prescriptions/new');

    await page.getByLabel(/medication name/i).fill('morphine');
    await page.getByRole('option', { name: /morphine/i }).click();

    // Should prompt PDMP check
    const pdmpPrompt = page.locator('[data-testid="pdmp-check-prompt"]');
    await expect(pdmpPrompt).toBeVisible();
    await expect(pdmpPrompt).toContainText(/prescription drug monitoring/i);

    await page.getByRole('button', { name: /check PDMP/i }).click();

    // Wait for PDMP results
    await expect(page.getByText(/PDMP.*checked/i)).toBeVisible();
  });

  test('should route prescription to patient preferred pharmacy', async ({ page }) => {
    // await loginAsProvider(page);
    await page.goto('/dashboard/patients/PT-008/prescriptions/new');

    await page.getByLabel(/medication name/i).fill('metformin');
    await page.getByRole('option', { name: /metformin/i }).click();

    // Fill prescription details
    await page.getByLabel(/dose/i).fill('500');
    await page.getByLabel(/frequency/i).selectOption('bid');
    await page.getByLabel(/duration/i).fill('90');

    // Verify preferred pharmacy shown
    await expect(page.getByText(/preferred pharmacy/i)).toBeVisible();
    await expect(page.getByText(/CVS.*Main St/i)).toBeVisible();

    // Change pharmacy
    await page.getByRole('button', { name: /change pharmacy/i }).click();
    await page.getByRole('option', { name: /Walgreens/i }).click();

    // Send prescription
    await page.getByRole('button', { name: /send.*prescription/i }).click();

    // Verify success
    await expect(page.getByText(/prescription sent.*walgreens/i)).toBeVisible();
  });
});

test.describe('Prescription Safety - Clinical Decision Support', () => {
  test('should suggest alternatives for contraindicated medications', async ({ page }) => {
    // await loginAsProvider(page);
    // Patient with penicillin allergy
    await page.goto('/dashboard/patients/PT-001/prescriptions/new');

    await page.getByLabel(/medication name/i).fill('amoxicillin');
    await page.getByRole('option', { name: /amoxicillin/i }).click();

    // Allergy alert should include alternatives
    const allergyAlert = page.locator('[data-testid="allergy-alert"]');
    await expect(allergyAlert).toBeVisible();

    // Check for alternative suggestions
    await expect(allergyAlert).toContainText(/alternative/i);
    await expect(allergyAlert).toContainText(/azithromycin|doxycycline/i);

    // Click to prescribe alternative
    await allergyAlert.getByRole('button', { name: /prescribe.*azithromycin/i }).click();

    // Verify alternative loaded
    await expect(page.getByLabel(/medication name/i)).toHaveValue(/azithromycin/i);
  });

  test('should provide indication-based prescribing', async ({ page }) => {
    // await loginAsProvider(page);
    await page.goto('/dashboard/patients/PT-009/prescriptions/new');

    // Select indication first
    await page.getByLabel(/indication/i).selectOption('hypertension');

    // Click "Suggest Medications"
    await page.getByRole('button', { name: /suggest.*medication/i }).click();

    // Should show evidence-based options
    const suggestions = page.locator('[data-testid="medication-suggestion"]');
    expect(await suggestions.count()).toBeGreaterThanOrEqual(3);

    // Verify suggestions include first-line agents
    await expect(page.getByText(/lisinopril.*first.*line/i)).toBeVisible();
    await expect(page.getByText(/amlodipine.*first.*line/i)).toBeVisible();
  });

  test('should show formulary status and alternatives', async ({ page }) => {
    // await loginAsProvider(page);
    await page.goto('/dashboard/patients/PT-010/prescriptions/new');

    await page.getByLabel(/medication name/i).fill('brand-name-statin');
    await page.getByRole('option', { name: /rosuvastatin.*brand/i }).click();

    // Should show formulary info
    const formularyInfo = page.locator('[data-testid="formulary-info"]');
    await expect(formularyInfo).toBeVisible();
    await expect(formularyInfo).toContainText(/non-formulary|tier 3/i);
    await expect(formularyInfo).toContainText(/\$\d+.*copay/i);

    // Should suggest formulary alternative
    await expect(formularyInfo).toContainText(/formulary alternative/i);
    await expect(formularyInfo).toContainText(/atorvastatin.*tier 1/i);
  });
});

test.describe('Prescription Safety - Patient Education', () => {
  test('should generate patient-friendly instructions', async ({ page }) => {
    // await loginAsProvider(page);
    await page.goto('/dashboard/patients/PT-011/prescriptions/new');

    await page.getByLabel(/medication name/i).fill('metformin');
    await page.getByRole('option', { name: /metformin/i }).click();

    await page.getByLabel(/dose/i).fill('500');
    await page.getByLabel(/frequency/i).selectOption('bid');

    // Should show patient instructions preview
    const instructions = page.locator('[data-testid="patient-instructions"]');
    await expect(instructions).toBeVisible();
    await expect(instructions).toContainText(/take.*tablet.*twice.*day/i);
    await expect(instructions).toContainText(/with meals/i);

    // Multilingual support
    await page.getByLabel(/language/i).selectOption('es');
    await expect(instructions).toContainText(/tome.*dos veces.*día/i);
  });

  test('should include medication warnings for patients', async ({ page }) => {
    // await loginAsProvider(page);
    await page.goto('/dashboard/patients/PT-012/prescriptions/new');

    await page.getByLabel(/medication name/i).fill('warfarin');
    await page.getByRole('option', { name: /warfarin/i }).click();

    // Should show patient warnings
    const warnings = page.locator('[data-testid="patient-warnings"]');
    await expect(warnings).toBeVisible();
    await expect(warnings).toContainText(/avoid.*vitamin K/i);
    await expect(warnings).toContainText(/regular blood tests/i);
    await expect(warnings).toContainText(/bleeding risk/i);
  });
});

test.describe('Prescription Safety - Audit and Compliance', () => {
  test('should log all prescription modifications', async ({ page }) => {
    // await loginAsProvider(page);
    await page.goto('/dashboard/patients/PT-013/prescriptions/PRX-001/edit');

    // Modify dose
    await page.getByLabel(/dose/i).clear();
    await page.getByLabel(/dose/i).fill('1000');

    // Add modification reason
    await page.getByLabel(/reason for change/i).fill('Patient tolerance improved');

    await page.getByRole('button', { name: /save changes/i }).click();

    // Verify audit log entry
    await page.goto('/dashboard/patients/PT-013/prescriptions/PRX-001/history');

    await expect(page.getByText(/dose changed.*500.*1000/i)).toBeVisible();
    await expect(page.getByText(/patient tolerance improved/i)).toBeVisible();
    await expect(page.getByText(/dr\./i)).toBeVisible(); // Provider name
    await expect(page.getByText(/\d{4}-\d{2}-\d{2}/)).toBeVisible(); // Timestamp
  });

  test('should enforce prescribing privileges', async ({ page }) => {
    // Login as nurse practitioner with limited privileges
    // await loginAsNP(page);
    await page.goto('/dashboard/patients/PT-014/prescriptions/new');

    // Try to prescribe Schedule II controlled substance
    await page.getByLabel(/medication name/i).fill('fentanyl');
    await page.getByRole('option', { name: /fentanyl/i }).click();

    // Should block due to lack of DEA authority
    const privilegeAlert = page.locator('[data-testid="privilege-alert"]');
    await expect(privilegeAlert).toBeVisible();
    await expect(privilegeAlert).toContainText(/insufficient.*privilege/i);
    await expect(privilegeAlert).toContainText(/schedule II.*requires.*MD.*DEA/i);

    await expect(page.getByRole('button', { name: /prescribe/i })).toBeDisabled();
  });
});
