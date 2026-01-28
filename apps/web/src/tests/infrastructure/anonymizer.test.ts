/**
 * AnonymizerService Unit Tests
 * 
 * Verifies PII redaction, medical term preservation, and rehydration.
 * 
 * Run: npx ts-node src/tests/infrastructure/anonymizer.test.ts
 */

import { AnonymizerService } from '../../services/anonymizer.service';

// ============================================================================
// TEST RUNNER
// ============================================================================

const anonymizer = AnonymizerService.getInstance();
let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
    try {
        fn();
        console.log(`✅ PASS: ${name}`);
        passed++;
    } catch (error) {
        console.error(`❌ FAIL: ${name}`);
        console.error(`   Error: ${(error as Error).message}`);
        failed++;
    }
}

function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(message);
    }
}

// ============================================================================
// TEST CASES
// ============================================================================

console.log('\n🔬 Running AnonymizerService Tests...\n');

// ---------------------------------------------------------------------------
// Test Case A: Basic PII Removal
// ---------------------------------------------------------------------------
test('Should redact phone numbers', () => {
    const input = 'Call John at 555-0199 or (800) 123-4567.';
    const result = anonymizer.anonymize(input);

    assert(!result.redactedText.includes('555-0199'), 'Phone number still present');
    assert(!result.redactedText.includes('800'), 'Phone area code still present');
    assert(result.redactedText.includes('[PHONE_'), 'Phone token missing');
});

test('Should redact names', () => {
    const input = 'Patient John Doe presented with chest pain.';
    const result = anonymizer.anonymize(input);

    assert(!result.redactedText.includes('John Doe'), 'Name still present');
    assert(result.redactedText.includes('[PATIENT_NAME_'), 'Name token missing');
});

test('Should redact dates', () => {
    const input = 'Appointment scheduled for 01/20/2026.';
    const result = anonymizer.anonymize(input);

    assert(!result.redactedText.includes('01/20/2026'), 'Date still present');
    assert(result.redactedText.includes('[DATE_'), 'Date token missing');
});

test('Should redact email addresses', () => {
    const input = 'Contact patient at john.doe@example.com';
    const result = anonymizer.anonymize(input);

    assert(!result.redactedText.includes('john.doe@example.com'), 'Email still present');
    assert(result.redactedText.includes('[EMAIL_'), 'Email token missing');
});

test('Should redact SSN', () => {
    const input = 'SSN: 123-45-6789';
    const result = anonymizer.anonymize(input);

    assert(!result.redactedText.includes('123-45-6789'), 'SSN still present');
    // Could be SSN or PHONE depending on pattern matching order
    assert(
        result.redactedText.includes('[SSN_') || result.redactedText.includes('[PHONE_'),
        'SSN/Phone token missing'
    );
});

// ---------------------------------------------------------------------------
// Test Case B: Medical Term Preservation
// ---------------------------------------------------------------------------
test('Should NOT redact Parkinson\'s Disease', () => {
    const input = 'Patient has Parkinson\'s Disease with tremor.';
    const result = anonymizer.anonymize(input);

    assert(result.redactedText.includes('Parkinson'), 'Parkinson was incorrectly redacted');
});

test('Should NOT redact Alzheimer\'s', () => {
    const input = 'Diagnosis: Alzheimer\'s dementia.';
    const result = anonymizer.anonymize(input);

    assert(result.redactedText.includes('Alzheimer'), 'Alzheimer was incorrectly redacted');
});

test('Should NOT redact Hashimoto\'s thyroiditis', () => {
    const input = 'Patient with Hashimoto\'s thyroiditis on levothyroxine.';
    const result = anonymizer.anonymize(input);

    assert(result.redactedText.includes('Hashimoto'), 'Hashimoto was incorrectly redacted');
});

test('Should NOT redact Addison\'s disease', () => {
    const input = 'Primary adrenal insufficiency (Addison\'s disease).';
    const result = anonymizer.anonymize(input);

    assert(result.redactedText.includes('Addison'), 'Addison was incorrectly redacted');
});

// ---------------------------------------------------------------------------
// Test Case C: Rehydration Round-Trip
// ---------------------------------------------------------------------------
test('Should perfectly rehydrate redacted text', () => {
    const original = 'Call John Doe at 555-0199 on 01/20/2026.';
    const { redactedText, rehydrationMap } = anonymizer.anonymize(original);

    // Verify redaction happened
    assert(redactedText !== original, 'Text was not redacted');

    // Verify rehydration restores original
    const rehydrated = anonymizer.rehydrate(redactedText, rehydrationMap);
    assert(rehydrated === original, `Rehydration failed. Got: "${rehydrated}"`);
});

test('Should handle complex clinical text with PII and medical terms', () => {
    const original = 'John Smith, DOB 03/15/1960, with Parkinson\'s Disease. Contact: 555-867-5309.';
    const { redactedText, rehydrationMap } = anonymizer.anonymize(original);

    // PII should be redacted
    assert(!redactedText.includes('John Smith'), 'Name not redacted');
    assert(!redactedText.includes('555-867-5309'), 'Phone not redacted');

    // Medical terms should remain
    assert(redactedText.includes('Parkinson'), 'Parkinson incorrectly redacted');

    // Round-trip should work
    const rehydrated = anonymizer.rehydrate(redactedText, rehydrationMap);
    assert(rehydrated === original, 'Rehydration failed');
});

// ---------------------------------------------------------------------------
// Test Case D: Performance
// ---------------------------------------------------------------------------
test('Should complete anonymization in under 50ms', () => {
    const longText = 'Patient John Doe, phone 555-1234, with Parkinson\'s. '.repeat(100);
    const start = performance.now();
    anonymizer.anonymize(longText);
    const elapsed = performance.now() - start;

    assert(elapsed < 50, `Anonymization took ${elapsed.toFixed(2)}ms (limit: 50ms)`);
});

// ---------------------------------------------------------------------------
// Test Case E: Edge Cases
// ---------------------------------------------------------------------------
test('Should handle empty string', () => {
    const result = anonymizer.anonymize('');
    assert(result.redactedText === '', 'Empty string not handled');
    assert(result.rehydrationMap.size === 0, 'Map should be empty');
});

test('Should handle text with no PII', () => {
    const input = 'Patient presents with mild headache and fatigue.';
    const result = anonymizer.anonymize(input);
    assert(result.redactedText === input, 'Text was incorrectly modified');
});

// ============================================================================
// RESULTS
// ============================================================================

console.log('\n' + '='.repeat(50));
console.log(`📊 Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50) + '\n');

if (failed > 0) {
    process.exit(1);
}
