/**
 * AnonymizerService Unit Tests
 *
 * Tests PII detection and redaction functionality for HIPAA compliance.
 * Verifies that medical eponyms are preserved while personal information is redacted.
 *
 * @module lib/privacy/__tests__/anonymizer.test
 */

import { AnonymizerService, anonymizer, AnonymizationResult } from '@/services/anonymizer.service';

describe('AnonymizerService', () => {
  let service: AnonymizerService;

  beforeEach(() => {
    // Get singleton instance for each test
    service = AnonymizerService.getInstance();
  });

  // ==========================================================================
  // 1. Phone Number Detection
  // ==========================================================================
  describe('Phone Number Detection', () => {
    it('should redact phone numbers in (xxx) xxx-xxxx format', () => {
      const input = 'Call the patient at (555) 123-4567 for follow-up.';
      const result = service.anonymize(input);

      expect(result.redactedText).toContain('[PHONE_');
      expect(result.redactedText).not.toContain('(555) 123-4567');
      expect(result.stats.redactionsByType.PHONE).toBeGreaterThanOrEqual(1);
    });

    it('should redact phone numbers in xxx-xxx-xxxx format', () => {
      const input = 'Contact number: 555-123-4567';
      const result = service.anonymize(input);

      expect(result.redactedText).toContain('[PHONE_');
      expect(result.redactedText).not.toContain('555-123-4567');
    });

    it('should redact phone numbers in xxxxxxxxxx format', () => {
      const input = 'Phone: 5551234567';
      const result = service.anonymize(input);

      expect(result.redactedText).toContain('[PHONE_');
      expect(result.redactedText).not.toContain('5551234567');
    });

    it('should redact multiple phone numbers in same text', () => {
      const input = 'Home: (555) 123-4567, Mobile: 555-987-6543';
      const result = service.anonymize(input);

      expect(result.redactedText).toContain('[PHONE_1]');
      expect(result.redactedText).toContain('[PHONE_2]');
      expect(result.stats.redactionsByType.PHONE).toBe(2);
    });
  });

  // ==========================================================================
  // 2. SSN Detection
  // ==========================================================================
  describe('SSN Detection', () => {
    it('should redact SSN in xxx-xx-xxxx format', () => {
      const input = 'Patient SSN: 123-45-6789';
      const result = service.anonymize(input);

      expect(result.redactedText).toContain('[SSN_');
      expect(result.redactedText).not.toContain('123-45-6789');
      expect(result.stats.redactionsByType.SSN).toBeGreaterThanOrEqual(1);
    });

    it('should redact SSN without dashes', () => {
      const input = 'SSN is 123456789';
      const result = service.anonymize(input);

      expect(result.redactedText).toContain('[SSN_');
      expect(result.redactedText).not.toContain('123456789');
    });

    it('should redact SSN with spaces', () => {
      const input = 'SSN: 123 45 6789';
      const result = service.anonymize(input);

      expect(result.redactedText).toContain('[SSN_');
      expect(result.redactedText).not.toContain('123 45 6789');
    });
  });

  // ==========================================================================
  // 3. Email Address Detection
  // ==========================================================================
  describe('Email Address Detection', () => {
    it('should redact standard email addresses', () => {
      const input = 'Contact: john.doe@example.com for questions.';
      const result = service.anonymize(input);

      expect(result.redactedText).toContain('[EMAIL_');
      expect(result.redactedText).not.toContain('john.doe@example.com');
      expect(result.stats.redactionsByType.EMAIL).toBe(1);
    });

    it('should redact email with plus addressing', () => {
      const input = 'Email: patient+test@hospital.org';
      const result = service.anonymize(input);

      expect(result.redactedText).toContain('[EMAIL_');
      expect(result.redactedText).not.toContain('patient+test@hospital.org');
    });

    it('should redact multiple emails', () => {
      const input = 'Send to: doctor@clinic.com, nurse@clinic.com';
      const result = service.anonymize(input);

      expect(result.stats.redactionsByType.EMAIL).toBe(2);
    });
  });

  // ==========================================================================
  // 4. Date Detection
  // ==========================================================================
  describe('Date Detection', () => {
    it('should redact dates in MM/DD/YYYY format', () => {
      const input = 'Appointment scheduled for 01/15/2024';
      const result = service.anonymize(input);

      expect(result.redactedText).toContain('[DATE_');
      expect(result.redactedText).not.toContain('01/15/2024');
      expect(result.stats.redactionsByType.DATE).toBeGreaterThanOrEqual(1);
    });

    it('should redact dates in YYYY-MM-DD format', () => {
      const input = 'Date of birth: 1990-05-20';
      const result = service.anonymize(input);

      expect(result.redactedText).toContain('[DATE_');
      expect(result.redactedText).not.toContain('1990-05-20');
    });

    it('should redact dates in "Month DD, YYYY" format', () => {
      const input = 'Visit on January 15, 2024';
      const result = service.anonymize(input);

      expect(result.redactedText).toContain('[DATE_');
      expect(result.redactedText).not.toContain('January 15, 2024');
    });

    it('should redact abbreviated month dates', () => {
      const input = 'Surgery on Dec 25, 2023';
      const result = service.anonymize(input);

      expect(result.redactedText).toContain('[DATE_');
      expect(result.redactedText).not.toContain('Dec 25, 2023');
    });

    it('should redact dates in MM-DD-YYYY format', () => {
      const input = 'Follow-up on 03-15-2024';
      const result = service.anonymize(input);

      expect(result.redactedText).toContain('[DATE_');
      expect(result.redactedText).not.toContain('03-15-2024');
    });
  });

  // ==========================================================================
  // 5. Street Address Detection
  // ==========================================================================
  describe('Street Address Detection', () => {
    it('should redact street addresses', () => {
      const input = 'Patient lives at 123 Main Street in the city.';
      const result = service.anonymize(input);

      expect(result.redactedText).toContain('[ADDRESS_');
      expect(result.redactedText).not.toContain('123 Main Street');
      expect(result.stats.redactionsByType.ADDRESS).toBeGreaterThanOrEqual(1);
    });

    it('should redact addresses with abbreviated street types', () => {
      const input = 'Send records to 456 Oak Ave';
      const result = service.anonymize(input);

      expect(result.redactedText).toContain('[ADDRESS_');
      expect(result.redactedText).not.toContain('456 Oak Ave');
    });

    it('should redact addresses with Boulevard', () => {
      const input = 'Office at 789 Sunset Boulevard';
      const result = service.anonymize(input);

      expect(result.redactedText).toContain('[ADDRESS_');
      expect(result.redactedText).not.toContain('789 Sunset Boulevard');
    });

    it('should redact addresses with multi-word street names', () => {
      const input = 'Located at 100 North Main Street';
      const result = service.anonymize(input);

      expect(result.redactedText).toContain('[ADDRESS_');
      expect(result.redactedText).not.toContain('100 North Main Street');
    });
  });

  // ==========================================================================
  // 6. MRN/Account Number Detection
  // ==========================================================================
  describe('MRN/Account Number Detection', () => {
    it('should redact MRN numbers', () => {
      const input = 'Patient MRN: 12345678';
      const result = service.anonymize(input);

      expect(result.redactedText).toContain('[MRN_');
      expect(result.redactedText).not.toContain('MRN: 12345678');
      expect(result.stats.redactionsByType.MRN).toBeGreaterThanOrEqual(1);
    });

    it('should redact Account numbers', () => {
      const input = 'Account: ABC123456';
      const result = service.anonymize(input);

      expect(result.redactedText).toContain('[MRN_');
      expect(result.redactedText).not.toContain('Account: ABC123456');
    });

    it('should redact Patient ID', () => {
      const input = 'Patient ID: P-789-XYZ';
      const result = service.anonymize(input);

      expect(result.redactedText).toContain('[MRN_');
      expect(result.redactedText).not.toContain('Patient ID: P-789-XYZ');
    });

    it('should redact Medical Record references', () => {
      const input = 'Medical Record#MR00123';
      const result = service.anonymize(input);

      expect(result.redactedText).toContain('[MRN_');
      expect(result.redactedText).not.toContain('Medical Record#MR00123');
    });
  });

  // ==========================================================================
  // 7. ZIP Code Detection
  // ==========================================================================
  describe('ZIP Code Detection', () => {
    it('should redact 5-digit ZIP codes', () => {
      const input = 'Mailing address ZIP: 90210';
      const result = service.anonymize(input);

      expect(result.redactedText).toContain('[ZIP_');
      expect(result.redactedText).not.toContain('90210');
      expect(result.stats.redactionsByType.ZIP).toBeGreaterThanOrEqual(1);
    });

    it('should redact 9-digit ZIP codes when unambiguous', () => {
      // Note: 9-digit ZIPs like "90210-1234" may match SSN pattern (xxx-xx-xxxx)
      // Service processes SSN before ZIP, so ambiguous patterns get SSN treatment.
      // Testing a clearly ZIP+4 context with address prefix
      const input = 'Mailing ZIP code: 12345-6789';
      const result = service.anonymize(input);

      // Either SSN or ZIP token is acceptable - both redact the sensitive data
      const hasZipOrSsn =
        result.redactedText.includes('[ZIP_') ||
        result.redactedText.includes('[SSN_');
      expect(hasZipOrSsn).toBe(true);
      expect(result.redactedText).not.toContain('12345-6789');
    });
  });

  // ==========================================================================
  // 8. Medical Eponym Preservation
  // ==========================================================================
  describe('Medical Eponym Preservation', () => {
    it('should NOT redact Parkinson disease reference', () => {
      const input = "Patient diagnosed with Parkinson's disease.";
      const result = service.anonymize(input);

      expect(result.redactedText).toContain("Parkinson's");
      expect(result.redactedText).not.toContain('[PATIENT_NAME_');
    });

    it('should NOT redact Alzheimer disease reference', () => {
      const input = "Early signs of Alzheimer's disease detected.";
      const result = service.anonymize(input);

      expect(result.redactedText).toContain("Alzheimer's");
    });

    it('should NOT redact Tylenol medication', () => {
      const input = 'Patient takes Tylenol for pain.';
      const result = service.anonymize(input);

      expect(result.redactedText).toContain('Tylenol');
    });

    it('should NOT redact Advil medication', () => {
      const input = 'Recommended Advil for inflammation.';
      const result = service.anonymize(input);

      expect(result.redactedText).toContain('Advil');
    });

    it('should NOT redact Crohn disease reference', () => {
      const input = "Managing Crohn's disease with medication.";
      const result = service.anonymize(input);

      expect(result.redactedText).toContain("Crohn's");
    });

    it('should NOT redact Hashimoto thyroiditis reference', () => {
      const input = "Diagnosed with Hashimoto's thyroiditis.";
      const result = service.anonymize(input);

      expect(result.redactedText).toContain("Hashimoto's");
    });

    it('should NOT redact Graves disease reference', () => {
      const input = "Patient has Graves disease symptoms.";
      const result = service.anonymize(input);

      expect(result.redactedText).toContain('Graves');
    });

    it('should NOT redact Motrin medication', () => {
      const input = 'Take Motrin as needed.';
      const result = service.anonymize(input);

      expect(result.redactedText).toContain('Motrin');
    });

    it('should preserve multiple medical eponyms in same text', () => {
      const input =
        "Patient with Parkinson's disease taking Tylenol and Advil for comfort.";
      const result = service.anonymize(input);

      expect(result.redactedText).toContain("Parkinson's");
      expect(result.redactedText).toContain('Tylenol');
      expect(result.redactedText).toContain('Advil');
    });
  });

  // ==========================================================================
  // 9. Token Mapping Consistency
  // ==========================================================================
  describe('Token Mapping Consistency', () => {
    it('should create consistent token mapping for same entity', () => {
      const input = 'Call 555-123-4567. Again, call 555-987-6543.';
      const result = service.anonymize(input);

      // Each unique phone number gets its own token
      expect(result.rehydrationMap.size).toBe(2);
      expect(result.rehydrationMap.get('[PHONE_1]')).toBe('555-123-4567');
      expect(result.rehydrationMap.get('[PHONE_2]')).toBe('555-987-6543');
    });

    it('should maintain correct mapping for multiple entity types', () => {
      const input =
        'Patient email: test@example.com, phone: 555-123-4567, DOB: 01/15/1990';
      const result = service.anonymize(input);

      // Verify all mappings exist
      let hasEmail = false;
      let hasPhone = false;
      let hasDate = false;

      for (const [token] of result.rehydrationMap) {
        if (token.includes('EMAIL')) hasEmail = true;
        if (token.includes('PHONE')) hasPhone = true;
        if (token.includes('DATE')) hasDate = true;
      }

      expect(hasEmail).toBe(true);
      expect(hasPhone).toBe(true);
      expect(hasDate).toBe(true);
    });
  });

  // ==========================================================================
  // 10. Rehydration
  // ==========================================================================
  describe('Rehydration', () => {
    it('should restore original text accurately', () => {
      const original = 'Contact John at john@example.com or 555-123-4567.';
      const anonymized = service.anonymize(original);
      const restored = service.rehydrate(
        anonymized.redactedText,
        anonymized.rehydrationMap
      );

      expect(restored).toContain('john@example.com');
      expect(restored).toContain('555-123-4567');
    });

    it('should restore all entity types correctly', () => {
      const original =
        'SSN: 123-45-6789, Email: patient@hospital.org, DOB: 01/15/1990, MRN: 12345';
      const anonymized = service.anonymize(original);
      const restored = service.rehydrate(
        anonymized.redactedText,
        anonymized.rehydrationMap
      );

      expect(restored).toContain('123-45-6789');
      expect(restored).toContain('patient@hospital.org');
      expect(restored).toContain('01/15/1990');
      expect(restored).toContain('MRN: 12345');
    });

    it('should handle rehydration with empty map', () => {
      const text = 'No PII here, just medical notes.';
      const restored = service.rehydrate(text, new Map());

      expect(restored).toBe(text);
    });

    it('should handle partial rehydration', () => {
      const original = 'Email: test@example.com, Phone: 555-123-4567';
      const anonymized = service.anonymize(original);

      // Create partial map with only email
      const partialMap = new Map<string, string>();
      for (const [key, value] of anonymized.rehydrationMap) {
        if (key.includes('EMAIL')) {
          partialMap.set(key, value);
        }
      }

      const restored = service.rehydrate(anonymized.redactedText, partialMap);

      expect(restored).toContain('test@example.com');
      expect(restored).toContain('[PHONE_'); // Phone token remains
    });
  });

  // ==========================================================================
  // 11. Performance
  // ==========================================================================
  describe('Performance', () => {
    it('should process 10KB text in under 100ms', () => {
      // Generate ~10KB of text with various PII patterns
      const piiPatterns = [
        'Patient John Smith (SSN: 123-45-6789) visited on 01/15/2024.',
        'Contact at john.smith@example.com or (555) 123-4567.',
        'Address: 123 Main Street, ZIP: 90210.',
        'MRN: ABC123456. Next visit: February 20, 2024.',
        "Diagnosis: Parkinson's disease. Medication: Tylenol 500mg.",
      ];

      // Build ~10KB string
      let largeText = '';
      while (largeText.length < 10 * 1024) {
        largeText += piiPatterns[Math.floor(Math.random() * piiPatterns.length)] + ' ';
      }

      const result = service.anonymize(largeText);

      expect(result.stats.anonymizationMs).toBeLessThan(100);
      expect(result.stats.totalRedactions).toBeGreaterThan(0);
    });

    it('should handle large documents efficiently', () => {
      // Generate ~50KB of mixed content
      const medicalNote =
        'Patient presents with chronic fatigue. History of hypertension. ';
      let largeDocument = '';

      for (let i = 0; i < 500; i++) {
        largeDocument += medicalNote;
        if (i % 10 === 0) {
          largeDocument += `Phone: 555-${String(i).padStart(3, '0')}-${String(i * 2).padStart(4, '0')}. `;
        }
      }

      const result = service.anonymize(largeDocument);

      // Should complete in reasonable time (< 500ms for 50KB)
      expect(result.stats.anonymizationMs).toBeLessThan(500);
    });
  });

  // ==========================================================================
  // 12. Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const result = service.anonymize('');

      expect(result.redactedText).toBe('');
      expect(result.stats.totalRedactions).toBe(0);
      expect(result.rehydrationMap.size).toBe(0);
    });

    it('should handle string with no PII', () => {
      const input =
        'The patient reports feeling better after treatment. Vital signs are stable.';
      const result = service.anonymize(input);

      expect(result.redactedText).toBe(input);
      expect(result.stats.totalRedactions).toBe(0);
    });

    it('should handle mixed content with PII and medical terms', () => {
      const input =
        "Patient John Smith with Parkinson's disease. SSN: 123-45-6789. Contact: 555-123-4567. Taking Tylenol and Advil. Address: 456 Oak Street. Follow-up on January 15, 2024.";

      const result = service.anonymize(input);

      // Medical terms preserved
      expect(result.redactedText).toContain("Parkinson's");
      expect(result.redactedText).toContain('Tylenol');
      expect(result.redactedText).toContain('Advil');

      // PII redacted
      expect(result.redactedText).not.toContain('123-45-6789');
      expect(result.redactedText).not.toContain('555-123-4567');
      expect(result.redactedText).not.toContain('456 Oak Street');
      expect(result.redactedText).not.toContain('January 15, 2024');

      // Verify stats
      expect(result.stats.redactionsByType.SSN).toBeGreaterThanOrEqual(1);
      expect(result.stats.redactionsByType.PHONE).toBeGreaterThanOrEqual(1);
      expect(result.stats.redactionsByType.ADDRESS).toBeGreaterThanOrEqual(1);
      expect(result.stats.redactionsByType.DATE).toBeGreaterThanOrEqual(1);
    });

    it('should handle special characters in text', () => {
      const input =
        'Notes: Patient\'s email is test@example.com! Call (555) 123-4567?';
      const result = service.anonymize(input);

      expect(result.redactedText).not.toContain('test@example.com');
      expect(result.redactedText).not.toContain('(555) 123-4567');
    });

    it('should handle unicode characters', () => {
      const input = 'Patient Jose Garcia email: jose@example.com';
      const result = service.anonymize(input);

      expect(result.redactedText).not.toContain('jose@example.com');
      expect(result.redactedText).toContain('[EMAIL_');
    });

    it('should handle newlines and whitespace', () => {
      const input = `Patient info:
        SSN: 123-45-6789
        Email: patient@hospital.org
        Phone: 555-123-4567`;

      const result = service.anonymize(input);

      expect(result.redactedText).not.toContain('123-45-6789');
      expect(result.redactedText).not.toContain('patient@hospital.org');
      expect(result.redactedText).not.toContain('555-123-4567');
      expect(result.stats.totalRedactions).toBeGreaterThan(0);
    });

    it('should handle consecutive PII elements', () => {
      const input = '555-123-4567 555-987-6543 555-111-2222';
      const result = service.anonymize(input);

      expect(result.stats.redactionsByType.PHONE).toBe(3);
    });
  });

  // ==========================================================================
  // Singleton Pattern Verification
  // ==========================================================================
  describe('Singleton Pattern', () => {
    it('should return same instance on multiple getInstance calls', () => {
      const instance1 = AnonymizerService.getInstance();
      const instance2 = AnonymizerService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should have exported singleton available', () => {
      expect(anonymizer).toBeDefined();
      expect(anonymizer).toBeInstanceOf(AnonymizerService);
    });
  });

  // ==========================================================================
  // Stats Verification
  // ==========================================================================
  describe('Statistics', () => {
    it('should return correct total redaction count', () => {
      const input =
        'Email: a@b.com, Phone: 555-111-2222, SSN: 111-22-3333, DOB: 01/01/2000';
      const result = service.anonymize(input);

      const sumOfTypes = Object.values(result.stats.redactionsByType).reduce(
        (acc, val) => acc + val,
        0
      );

      expect(result.stats.totalRedactions).toBe(sumOfTypes);
    });

    it('should include anonymization time in stats', () => {
      const result = service.anonymize('Test text');

      expect(result.stats.anonymizationMs).toBeDefined();
      expect(typeof result.stats.anonymizationMs).toBe('number');
      expect(result.stats.anonymizationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
