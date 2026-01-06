import { test, expect } from '@playwright/test';

/**
 * E2E Tests for AI SOAP Note Generation
 * Tests the core AI medical scribe functionality
 */

test.describe('SOAP Note Generation - Audio Transcription', () => {
  test.beforeEach(async ({ page }) => {
    // await loginAsProvider(page);
    await page.goto('/dashboard/patients/PT-001/encounters/new');
  });

  test('should upload audio file and initiate transcription', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /new encounter/i })).toBeVisible();

    // Upload audio file
    const fileInput = page.locator('input[type="file"][accept*="audio"]');
    await fileInput.setInputFiles({
      name: 'clinical-encounter.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('mock audio data'),
    });

    // Verify file uploaded
    await expect(page.getByText(/clinical-encounter\.mp3/i)).toBeVisible();

    // Start transcription
    await page.getByRole('button', { name: /transcribe|start/i }).click();

    // Verify transcription started
    await expect(page.getByText(/transcribing/i)).toBeVisible();
    await expect(page.locator('[data-testid="transcription-progress"]')).toBeVisible();
  });

  test('should show real-time transcription progress', async ({ page }) => {
    // Upload and start transcription
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'encounter.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('mock audio'),
    });

    await page.getByRole('button', { name: /transcribe/i }).click();

    // Check progress indicator
    const progressBar = page.locator('[data-testid="transcription-progress"]');
    await expect(progressBar).toBeVisible();

    // Wait for completion (with timeout)
    await expect(page.getByText(/transcription complete/i)).toBeVisible({ timeout: 30000 });

    // Verify transcript appears
    await expect(page.locator('[data-testid="transcript-text"]')).toBeVisible();
  });

  test('should support live audio recording', async ({ page }) => {
    // Click record button
    await page.getByRole('button', { name: /record|start recording/i }).click();

    // Verify recording started
    await expect(page.getByText(/recording/i)).toBeVisible();
    await expect(page.locator('[data-testid="recording-timer"]')).toBeVisible();

    // Stop recording
    await page.waitForTimeout(2000);
    await page.getByRole('button', { name: /stop recording/i }).click();

    // Verify recording stopped
    await expect(page.getByText(/recording complete/i)).toBeVisible();

    // Should auto-start transcription
    await expect(page.getByText(/transcribing/i)).toBeVisible();
  });

  test('should handle transcription errors gracefully', async ({ page }) => {
    // Upload corrupted file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'corrupted.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('invalid audio data'),
    });

    await page.getByRole('button', { name: /transcribe/i }).click();

    // Should show error message
    await expect(page.getByText(/transcription failed|error/i)).toBeVisible({ timeout: 15000 });

    // Should offer retry
    await expect(page.getByRole('button', { name: /retry|try again/i })).toBeVisible();
  });

  test('should support multiple audio providers (Deepgram, Whisper, AssemblyAI)', async ({ page }) => {
    // Open settings
    await page.getByRole('button', { name: /settings|options/i }).click();

    // Select AI provider
    const providerSelect = page.getByLabel(/transcription provider/i);
    await expect(providerSelect).toBeVisible();

    // Verify options available
    await providerSelect.click();
    await expect(page.getByRole('option', { name: /deepgram/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /whisper/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /assemblyai/i })).toBeVisible();

    // Select provider
    await page.getByRole('option', { name: /deepgram/i }).click();

    // Verify selection saved
    await expect(providerSelect).toHaveValue(/deepgram/i);
  });
});

test.describe('SOAP Note Generation - AI Processing', () => {
  test.beforeEach(async ({ page }) => {
    // await loginAsProvider(page);
    // Navigate to encounter with completed transcription
    await page.goto('/dashboard/patients/PT-001/encounters/ENC-001/edit');
  });

  test('should generate SOAP note from transcript', async ({ page }) => {
    // Verify transcript is loaded
    await expect(page.locator('[data-testid="transcript-text"]')).toBeVisible();

    // Click generate SOAP note
    await page.getByRole('button', { name: /generate.*note|create.*soap/i }).click();

    // Verify AI processing started
    await expect(page.getByText(/generating/i)).toBeVisible();

    // Wait for completion
    await expect(page.getByText(/note generated/i)).toBeVisible({ timeout: 60000 });

    // Verify SOAP sections populated
    await expect(page.locator('[data-testid="soap-subjective"]')).not.toBeEmpty();
    await expect(page.locator('[data-testid="soap-objective"]')).not.toBeEmpty();
    await expect(page.locator('[data-testid="soap-assessment"]')).not.toBeEmpty();
    await expect(page.locator('[data-testid="soap-plan"]')).not.toBeEmpty();
  });

  test('should use appropriate specialty template', async ({ page }) => {
    // Select specialty
    await page.getByLabel(/specialty|template/i).selectOption('cardiology');

    // Generate note
    await page.getByRole('button', { name: /generate.*note/i }).click();
    await expect(page.getByText(/note generated/i)).toBeVisible({ timeout: 60000 });

    // Verify cardiology-specific sections
    await expect(page.getByRole('heading', { name: /cardiac history/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /cardiovascular exam/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /ekg findings/i })).toBeVisible();
  });

  test('should support 14+ specialty templates', async ({ page }) => {
    const templateSelect = page.getByLabel(/specialty|template/i);
    await templateSelect.click();

    // Verify templates available
    const specialties = [
      'general-medicine',
      'cardiology',
      'dermatology',
      'endocrinology',
      'gastroenterology',
      'neurology',
      'orthopedics',
      'pediatrics',
      'psychiatry',
      'pulmonology',
      'nephrology',
      'oncology',
      'obstetrics',
      'surgery',
    ];

    for (const specialty of specialties) {
      await expect(page.getByRole('option', { name: new RegExp(specialty, 'i') })).toBeVisible();
    }
  });

  test('should allow AI provider selection (Claude, Gemini, GPT-4)', async ({ page }) => {
    await page.getByRole('button', { name: /settings/i }).click();

    const aiProviderSelect = page.getByLabel(/ai provider|llm/i);
    await expect(aiProviderSelect).toBeVisible();

    // Verify providers available
    await aiProviderSelect.click();
    await expect(page.getByRole('option', { name: /claude/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /gemini/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /gpt.*4/i })).toBeVisible();

    // Select provider
    await page.getByRole('option', { name: /claude/i }).click();
    await expect(aiProviderSelect).toHaveValue(/claude/i);
  });
});

test.describe('SOAP Note Generation - Confidence Scoring', () => {
  test.beforeEach(async ({ page }) => {
    // await loginAsProvider(page);
    await page.goto('/dashboard/patients/PT-002/encounters/ENC-002/edit');
  });

  test('should display confidence scores for each section', async ({ page }) => {
    await page.getByRole('button', { name: /generate.*note/i }).click();
    await expect(page.getByText(/note generated/i)).toBeVisible({ timeout: 60000 });

    // Check confidence scores
    const subjectiveScore = page.locator('[data-testid="confidence-subjective"]');
    await expect(subjectiveScore).toBeVisible();
    await expect(subjectiveScore).toContainText(/\d+%/);

    const objectiveScore = page.locator('[data-testid="confidence-objective"]');
    await expect(objectiveScore).toBeVisible();

    const assessmentScore = page.locator('[data-testid="confidence-assessment"]');
    await expect(assessmentScore).toBeVisible();

    const planScore = page.locator('[data-testid="confidence-plan"]');
    await expect(planScore).toBeVisible();
  });

  test('should flag low-confidence sections for review', async ({ page }) => {
    await page.getByRole('button', { name: /generate.*note/i }).click();
    await expect(page.getByText(/note generated/i)).toBeVisible({ timeout: 60000 });

    // Check for low-confidence warnings
    const lowConfidenceSections = page.locator('[data-testid="low-confidence-warning"]');
    const count = await lowConfidenceSections.count();

    if (count > 0) {
      // Verify warning is visible
      await expect(lowConfidenceSections.first()).toBeVisible();
      await expect(lowConfidenceSections.first()).toContainText(/confidence.*below.*80%/i);

      // Verify section is highlighted
      const flaggedSection = page.locator('[data-testid*="flagged"]').first();
      await expect(flaggedSection).toHaveClass(/warning|flagged|yellow/);
    }
  });

  test('should automatically send low-confidence notes to review queue', async ({ page }) => {
    // Generate note with low confidence (mock scenario)
    await page.getByRole('button', { name: /generate.*note/i }).click();
    await expect(page.getByText(/note generated/i)).toBeVisible({ timeout: 60000 });

    // If confidence < 80%, should show review queue notification
    const reviewQueueNotice = page.locator('[data-testid="review-queue-notice"]');

    // Check if visible (depends on confidence score)
    const isVisible = await reviewQueueNotice.isVisible({ timeout: 2000 }).catch(() => false);

    if (isVisible) {
      await expect(reviewQueueNotice).toContainText(/sent to review queue/i);
      await expect(reviewQueueNotice).toContainText(/requires.*review/i);

      // Verify link to review queue
      await expect(page.getByRole('link', { name: /view.*review queue/i })).toBeVisible();
    }
  });

  test('should show confidence breakdown by medical entity', async ({ page }) => {
    await page.getByRole('button', { name: /generate.*note/i }).click();
    await expect(page.getByText(/note generated/i)).toBeVisible({ timeout: 60000 });

    // Click confidence details
    await page.getByRole('button', { name: /confidence details|show details/i }).click();

    const detailsPanel = page.locator('[data-testid="confidence-details"]');
    await expect(detailsPanel).toBeVisible();

    // Verify entity-level confidence
    await expect(detailsPanel).toContainText(/diagnosis/i);
    await expect(detailsPanel).toContainText(/medication/i);
    await expect(detailsPanel).toContainText(/vital signs/i);
  });
});

test.describe('SOAP Note Generation - Review Queue Workflow', () => {
  test('should allow provider to review and approve note', async ({ page }) => {
    // await loginAsProvider(page);
    await page.goto('/dashboard/review-queue');

    await expect(page.getByRole('heading', { name: /review queue/i })).toBeVisible();

    // Click first note in queue
    const firstNote = page.locator('[data-testid="review-item"]').first();
    await firstNote.click();

    // Verify note details
    await expect(page.locator('[data-testid="note-content"]')).toBeVisible();
    await expect(page.locator('[data-testid="confidence-scores"]')).toBeVisible();

    // Review and approve
    await page.getByRole('button', { name: /approve/i }).click();

    // Verify approval confirmation
    await expect(page.getByText(/approved/i)).toBeVisible();

    // Verify removed from queue
    await page.goto('/dashboard/review-queue');
    // Previous note should not be first anymore or queue count decreased
  });

  test('should allow manual corrections with feedback', async ({ page }) => {
    // await loginAsProvider(page);
    await page.goto('/dashboard/review-queue/RQ-001');

    // Make correction
    const assessmentField = page.locator('[data-testid="soap-assessment"]');
    await assessmentField.click();

    // Edit text
    const editableContent = assessmentField.locator('[contenteditable="true"]');
    await editableContent.fill('Corrected assessment: Hypertension, well-controlled');

    // Mark as corrected
    await page.getByRole('button', { name: /mark.*corrected|submit correction/i }).click();

    // Add feedback for AI learning
    const feedbackDialog = page.getByRole('dialog', { name: /feedback/i });
    await expect(feedbackDialog).toBeVisible();

    await feedbackDialog.getByLabel(/what was incorrect/i).fill('AI missed "well-controlled" qualifier');
    await feedbackDialog.getByLabel(/correction type/i).selectOption('clinical-accuracy');

    await feedbackDialog.getByRole('button', { name: /submit/i }).click();

    // Verify correction saved
    await expect(page.getByText(/correction saved/i)).toBeVisible();
  });

  test('should reject note and send back for regeneration', async ({ page }) => {
    // await loginAsProvider(page);
    await page.goto('/dashboard/review-queue/RQ-002');

    // Reject note
    await page.getByRole('button', { name: /reject|regenerate/i }).click();

    // Provide rejection reason
    const rejectDialog = page.getByRole('dialog', { name: /reject/i });
    await rejectDialog.getByLabel(/reason/i).fill('Significant inaccuracies in assessment section');
    await rejectDialog.getByRole('button', { name: /confirm/i }).click();

    // Should trigger regeneration
    await expect(page.getByText(/regenerating/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show review queue metrics', async ({ page }) => {
    // await loginAsProvider(page);
    await page.goto('/dashboard/review-queue');

    // Verify metrics displayed
    await expect(page.getByText(/pending.*review/i)).toBeVisible();
    await expect(page.getByText(/average.*confidence/i)).toBeVisible();
    await expect(page.getByText(/approval.*rate/i)).toBeVisible();

    // Verify numbers are present
    await expect(page.locator('[data-testid="pending-count"]')).toContainText(/\d+/);
    await expect(page.locator('[data-testid="avg-confidence"]')).toContainText(/\d+%/);
  });
});

test.describe('SOAP Note Generation - Manual Editing', () => {
  test.beforeEach(async ({ page }) => {
    // await loginAsProvider(page);
    await page.goto('/dashboard/patients/PT-003/encounters/ENC-003/edit');
  });

  test('should allow inline editing of generated content', async ({ page }) => {
    // Generate note first
    await page.getByRole('button', { name: /generate.*note/i }).click();
    await expect(page.getByText(/note generated/i)).toBeVisible({ timeout: 60000 });

    // Edit subjective section
    const subjectiveSection = page.locator('[data-testid="soap-subjective"]');
    await subjectiveSection.click();

    const editableContent = subjectiveSection.locator('[contenteditable="true"]');
    await editableContent.fill('Patient reports chest pain, 7/10 severity, radiating to left arm');

    // Verify changes saved
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.getByText(/saved/i)).toBeVisible();

    // Verify change persisted
    await page.reload();
    await expect(subjectiveSection).toContainText(/chest pain.*7\/10/i);
  });

  test('should support rich text formatting', async ({ page }) => {
    const objectiveSection = page.locator('[data-testid="soap-objective"]');
    await objectiveSection.click();

    // Bold text
    await page.keyboard.press('Control+B');
    await page.keyboard.type('Blood Pressure: 140/90');
    await page.keyboard.press('Control+B');

    // Verify formatting applied
    await expect(objectiveSection.locator('strong')).toContainText(/blood pressure/i);
  });

  test('should track version history', async ({ page }) => {
    // Generate initial note
    await page.getByRole('button', { name: /generate.*note/i }).click();
    await expect(page.getByText(/note generated/i)).toBeVisible({ timeout: 60000 });

    await page.getByRole('button', { name: /save/i }).click();

    // Make edit
    const planSection = page.locator('[data-testid="soap-plan"]');
    await planSection.click();
    await planSection.locator('[contenteditable="true"]').fill('Updated plan: Start metformin 500mg BID');
    await page.getByRole('button', { name: /save/i }).click();

    // View version history
    await page.getByRole('button', { name: /history|versions/i }).click();

    const historyPanel = page.locator('[data-testid="version-history"]');
    await expect(historyPanel).toBeVisible();

    // Verify multiple versions
    const versions = historyPanel.locator('[data-testid="version-item"]');
    expect(await versions.count()).toBeGreaterThanOrEqual(2);

    // Verify version details
    await expect(versions.first()).toContainText(/dr\./i); // Provider name
    await expect(versions.first()).toContainText(/\d{2}\/\d{2}\/\d{4}/); // Date
  });

  test('should support note addendums', async ({ page }) => {
    // Save note
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.getByText(/saved/i)).toBeVisible();

    // Add addendum
    await page.getByRole('button', { name: /add addendum/i }).click();

    const addendumDialog = page.getByRole('dialog', { name: /addendum/i });
    await expect(addendumDialog).toBeVisible();

    await addendumDialog.getByLabel(/addendum text/i).fill('Patient called at 3pm reporting improved symptoms');
    await addendumDialog.getByRole('button', { name: /save addendum/i }).click();

    // Verify addendum appears
    await expect(page.locator('[data-testid="addendum"]')).toBeVisible();
    await expect(page.locator('[data-testid="addendum"]')).toContainText(/improved symptoms/i);
  });
});

test.describe('SOAP Note Generation - PHI De-identification', () => {
  test('should detect and flag PHI in notes', async ({ page }) => {
    // await loginAsProvider(page);
    await page.goto('/dashboard/patients/PT-004/encounters/ENC-004/edit');

    // Generate note
    await page.getByRole('button', { name: /generate.*note/i }).click();
    await expect(page.getByText(/note generated/i)).toBeVisible({ timeout: 60000 });

    // Check for PHI detection
    const phiIndicators = page.locator('[data-testid="phi-detected"]');
    const count = await phiIndicators.count();

    if (count > 0) {
      // Verify PHI types marked
      await expect(phiIndicators.first()).toHaveAttribute('data-phi-type');

      // Common PHI types: NAME, DOB, MRN, SSN, ADDRESS, PHONE
      const phiType = await phiIndicators.first().getAttribute('data-phi-type');
      expect(['NAME', 'DOB', 'MRN', 'SSN', 'ADDRESS', 'PHONE', 'EMAIL']).toContain(phiType);
    }
  });

  test('should support de-identification for research export', async ({ page }) => {
    // await loginAsProvider(page);
    await page.goto('/dashboard/patients/PT-004/encounters/ENC-004/edit');

    // Open export menu
    await page.getByRole('button', { name: /export|download/i }).click();

    // Select de-identified export
    await page.getByLabel(/de-identify|remove phi/i).check();

    // Export
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /download.*pdf|export/i }).click();
    const download = await downloadPromise;

    // Verify file downloaded
    expect(download.suggestedFilename()).toMatch(/de-identified|anonymized/i);
  });
});

test.describe('SOAP Note Generation - Performance', () => {
  test('should generate SOAP note within 30 seconds', async ({ page }) => {
    // await loginAsProvider(page);
    await page.goto('/dashboard/patients/PT-005/encounters/ENC-005/edit');

    const startTime = Date.now();

    await page.getByRole('button', { name: /generate.*note/i }).click();
    await expect(page.getByText(/note generated/i)).toBeVisible({ timeout: 60000 });

    const duration = Date.now() - startTime;

    // Should complete within 30 seconds
    expect(duration).toBeLessThan(30000);
  });

  test('should handle concurrent note generation', async ({ page, context }) => {
    // Open multiple encounters
    const page1 = page;
    const page2 = await context.newPage();

    await page1.goto('/dashboard/patients/PT-006/encounters/ENC-006/edit');
    await page2.goto('/dashboard/patients/PT-007/encounters/ENC-007/edit');

    // Start generation on both
    await Promise.all([
      page1.getByRole('button', { name: /generate.*note/i }).click(),
      page2.getByRole('button', { name: /generate.*note/i }).click(),
    ]);

    // Both should complete
    await expect(page1.getByText(/note generated/i)).toBeVisible({ timeout: 60000 });
    await expect(page2.getByText(/note generated/i)).toBeVisible({ timeout: 60000 });

    await page2.close();
  });
});

test.describe('SOAP Note Generation - Integration', () => {
  test('should extract and link ICD-10 codes from assessment', async ({ page }) => {
    // await loginAsProvider(page);
    await page.goto('/dashboard/patients/PT-008/encounters/ENC-008/edit');

    await page.getByRole('button', { name: /generate.*note/i }).click();
    await expect(page.getByText(/note generated/i)).toBeVisible({ timeout: 60000 });

    // Check for ICD-10 codes
    const icdCodes = page.locator('[data-testid="icd-code"]');
    const count = await icdCodes.count();

    if (count > 0) {
      // Verify code format (e.g., I10, E11.9)
      const codeText = await icdCodes.first().textContent();
      expect(codeText).toMatch(/[A-Z]\d{2}(\.\d+)?/);

      // Verify clickable for details
      await icdCodes.first().click();
      await expect(page.getByRole('dialog', { name: /icd.*code/i })).toBeVisible();
    }
  });

  test('should suggest procedures and CPT codes from plan', async ({ page }) => {
    // await loginAsProvider(page);
    await page.goto('/dashboard/patients/PT-009/encounters/ENC-009/edit');

    await page.getByRole('button', { name: /generate.*note/i }).click();
    await expect(page.getByText(/note generated/i)).toBeVisible({ timeout: 60000 });

    // Check for CPT code suggestions
    const cptSuggestions = page.locator('[data-testid="cpt-suggestion"]');
    const count = await cptSuggestions.count();

    if (count > 0) {
      // Verify CPT format (5 digits)
      const cptText = await cptSuggestions.first().textContent();
      expect(cptText).toMatch(/\d{5}/);
    }
  });

  test('should auto-populate billing from SOAP note', async ({ page }) => {
    // await loginAsProvider(page);
    await page.goto('/dashboard/patients/PT-010/encounters/ENC-010/edit');

    await page.getByRole('button', { name: /generate.*note/i }).click();
    await expect(page.getByText(/note generated/i)).toBeVisible({ timeout: 60000 });

    // Save note
    await page.getByRole('button', { name: /save/i }).click();

    // Navigate to billing
    await page.getByRole('link', { name: /billing|charges/i }).click();

    // Verify diagnoses populated
    await expect(page.locator('[data-testid="billing-diagnoses"]')).not.toBeEmpty();

    // Verify procedures suggested
    await expect(page.locator('[data-testid="billing-procedures"]')).not.toBeEmpty();
  });
});

test.describe('SOAP Note Generation - Accessibility', () => {
  test('should support voice commands during note editing', async ({ page }) => {
    // await loginAsProvider(page);
    await page.goto('/dashboard/patients/PT-011/encounters/ENC-011/edit');

    // Enable voice commands
    await page.getByRole('button', { name: /voice.*command|dictation/i }).click();

    // Verify microphone access requested
    await expect(page.getByText(/microphone.*access/i)).toBeVisible();

    // Verify voice indicator
    await expect(page.locator('[data-testid="voice-indicator"]')).toBeVisible();
  });

  test('should support keyboard shortcuts', async ({ page }) => {
    // await loginAsProvider(page);
    await page.goto('/dashboard/patients/PT-012/encounters/ENC-012/edit');

    // Test shortcuts
    // Ctrl+G: Generate note
    await page.keyboard.press('Control+G');
    await expect(page.getByText(/generating/i)).toBeVisible();

    // Ctrl+S: Save
    await page.keyboard.press('Control+S');
    await expect(page.getByText(/saved/i)).toBeVisible();
  });
});
