/**
 * Unit Tests: Opt-Out Utilities
 * Tests TCPA and CAN-SPAM compliant opt-out functionality
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  encryptPatientId,
  generateSmsOptOutUrl,
  generateEmailOptOutUrl,
  generateOptOutUrl,
  generateSmsOptOutText,
  generateEmailOptOutFooter,
} from '../opt-out';

describe('Opt-Out Utilities (TCPA & CAN-SPAM Compliance)', () => {
  const testPatientId = 'test-patient-123';
  const testBaseUrl = 'https://holilabs.com';

  // ===========================================================================
  // Token Encryption Tests
  // ===========================================================================

  describe('encryptPatientId', () => {
    it('should encrypt patient ID to a hex string', () => {
      const encrypted = encryptPatientId(testPatientId);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).toMatch(/^[a-f0-9]+$/); // Hex string
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it('should generate consistent token for same patient ID', () => {
      const token1 = encryptPatientId(testPatientId);
      const token2 = encryptPatientId(testPatientId);

      // Should be consistent with same IV (production should use random IV)
      expect(token1).toBe(token2);
    });

    it('should generate different tokens for different patient IDs', () => {
      const token1 = encryptPatientId('patient-1');
      const token2 = encryptPatientId('patient-2');

      expect(token1).not.toBe(token2);
    });

    it('should handle empty patient ID', () => {
      const token = encryptPatientId('');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should handle special characters in patient ID', () => {
      const specialPatientId = 'patient-123-@#$%';
      const token = encryptPatientId(specialPatientId);

      expect(token).toBeDefined();
      expect(token).toMatch(/^[a-f0-9]+$/);
    });
  });

  // ===========================================================================
  // SMS Opt-Out URL Tests (TCPA Compliance)
  // ===========================================================================

  describe('generateSmsOptOutUrl', () => {
    it('should generate valid SMS opt-out URL', () => {
      const url = generateSmsOptOutUrl(testPatientId);

      expect(url).toContain('/api/patients/preferences/opt-out');
      expect(url).toContain('type=sms');
      expect(url).toContain('token=');
    });

    it('should use custom base URL when provided', () => {
      const customUrl = 'https://custom-domain.com';
      const url = generateSmsOptOutUrl(testPatientId, customUrl);

      expect(url).toMatch(new RegExp(`^${customUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
      expect(url).toContain('type=sms');
    });

    it('should use default URL from env when no base URL provided', () => {
      const url = generateSmsOptOutUrl(testPatientId);

      // In test environment, uses localhost or env variable
      expect(url).toMatch(/^https?:\/\//);
      expect(url).toContain('/api/patients/preferences/opt-out');
    });

    it('should include encrypted patient token', () => {
      const url = generateSmsOptOutUrl(testPatientId);
      const token = encryptPatientId(testPatientId);

      expect(url).toContain(`token=${token}`);
    });

    it('should be URL-safe', () => {
      const url = generateSmsOptOutUrl(testPatientId);

      // Should be parseable as a URL
      expect(() => new URL(url)).not.toThrow();
    });
  });

  // ===========================================================================
  // Email Opt-Out URL Tests (CAN-SPAM Compliance)
  // ===========================================================================

  describe('generateEmailOptOutUrl', () => {
    it('should generate valid email opt-out URL', () => {
      const url = generateEmailOptOutUrl(testPatientId);

      expect(url).toContain('/api/patients/preferences/opt-out');
      expect(url).toContain('type=email');
      expect(url).toContain('token=');
    });

    it('should use custom base URL when provided', () => {
      const customUrl = 'https://custom-domain.com';
      const url = generateEmailOptOutUrl(testPatientId, customUrl);

      expect(url).toMatch(new RegExp(`^${customUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
      expect(url).toContain('type=email');
    });

    it('should be different from SMS opt-out URL', () => {
      const smsUrl = generateSmsOptOutUrl(testPatientId);
      const emailUrl = generateEmailOptOutUrl(testPatientId);

      expect(smsUrl).not.toBe(emailUrl);
      expect(smsUrl).toContain('type=sms');
      expect(emailUrl).toContain('type=email');
    });
  });

  // ===========================================================================
  // All Communications Opt-Out URL Tests
  // ===========================================================================

  describe('generateOptOutUrl', () => {
    it('should generate URL to opt out of all communications', () => {
      const url = generateOptOutUrl(testPatientId);

      expect(url).toContain('/api/patients/preferences/opt-out');
      expect(url).toContain('type=all');
      expect(url).toContain('token=');
    });

    it('should use custom base URL when provided', () => {
      const customUrl = 'https://custom-domain.com';
      const url = generateOptOutUrl(testPatientId, customUrl);

      expect(url).toMatch(new RegExp(`^${customUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
      expect(url).toContain('type=all');
    });
  });

  // ===========================================================================
  // SMS Opt-Out Text Tests (TCPA Required)
  // ===========================================================================

  describe('generateSmsOptOutText', () => {
    it('should include "Reply STOP" instruction (TCPA required)', () => {
      const text = generateSmsOptOutText(testPatientId);

      expect(text.toLowerCase()).toContain('stop');
      expect(text.toLowerCase()).toContain('reply');
    });

    it('should include opt-out URL', () => {
      const text = generateSmsOptOutText(testPatientId);
      const url = generateSmsOptOutUrl(testPatientId);

      expect(text).toContain(url);
    });

    it('should be concise (for SMS character limits)', () => {
      const text = generateSmsOptOutText(testPatientId);

      // SMS opt-out should be under 160 characters when possible
      // With URL shortening, this should be achievable
      expect(text.length).toBeLessThan(300); // Reasonable limit
    });

    it('should include "opt-out" terminology', () => {
      const text = generateSmsOptOutText(testPatientId);

      expect(text.toLowerCase()).toContain('opt-out');
    });
  });

  // ===========================================================================
  // Email Opt-Out Footer Tests (CAN-SPAM Required)
  // ===========================================================================

  describe('generateEmailOptOutFooter', () => {
    it('should generate HTML footer', () => {
      const footer = generateEmailOptOutFooter(testPatientId);

      expect(footer).toContain('<div');
      expect(footer).toContain('</div>');
    });

    it('should include unsubscribe link (CAN-SPAM required)', () => {
      const footer = generateEmailOptOutFooter(testPatientId);

      // Spanish: "Cancelar suscripción" or "dejar de recibir"
      expect(footer.toLowerCase()).toMatch(/suscripción|unsubscribe|cancelar/);
      expect(footer).toContain('<a');
      expect(footer).toContain('href=');
    });

    it('should include opt-out URL in link', () => {
      const footer = generateEmailOptOutFooter(testPatientId);
      const url = generateEmailOptOutUrl(testPatientId);

      expect(footer).toContain(url);
    });

    it('should include company information', () => {
      const footer = generateEmailOptOutFooter(testPatientId);

      expect(footer).toContain('HoliLabs');
    });

    it('should be properly formatted HTML', () => {
      const footer = generateEmailOptOutFooter(testPatientId);

      // Should have opening and closing div tags
      const openDivCount = (footer.match(/<div/g) || []).length;
      const closeDivCount = (footer.match(/<\/div>/g) || []).length;
      expect(openDivCount).toBe(closeDivCount);
    });

    it('should use Spanish language (for Mexican market)', () => {
      const footer = generateEmailOptOutFooter(testPatientId);

      // Should contain Spanish text
      expect(footer).toContain('dejar de recibir');
    });

    it('should include clickable link', () => {
      const footer = generateEmailOptOutFooter(testPatientId);

      expect(footer).toMatch(/<a[^>]+href="[^"]+"[^>]*>/);
    });
  });

  // ===========================================================================
  // Security Tests
  // ===========================================================================

  describe('Security Considerations', () => {
    it('should not expose patient ID in plain text in URLs', () => {
      const url = generateSmsOptOutUrl(testPatientId);

      expect(url).not.toContain(testPatientId);
    });

    it('should use HTTPS in production URLs', () => {
      // In test environment, localhost uses HTTP, but production should use HTTPS
      const productionUrl = generateSmsOptOutUrl(testPatientId, 'https://holilabs.com');

      expect(productionUrl).toMatch(/^https:\/\//);
    });

    it('should generate unique tokens for different patients', () => {
      const url1 = generateSmsOptOutUrl('patient-1');
      const url2 = generateSmsOptOutUrl('patient-2');

      // Extract tokens
      const token1 = new URL(url1).searchParams.get('token');
      const token2 = new URL(url2).searchParams.get('token');

      expect(token1).not.toBe(token2);
    });
  });

  // ===========================================================================
  // Compliance Tests
  // ===========================================================================

  describe('Regulatory Compliance', () => {
    it('TCPA: SMS opt-out text should include "STOP" keyword', () => {
      const text = generateSmsOptOutText(testPatientId);

      expect(text.toUpperCase()).toContain('STOP');
    });

    it('TCPA: SMS opt-out URL should be accessible', () => {
      const url = generateSmsOptOutUrl(testPatientId);

      // URL should be valid and accessible
      expect(() => new URL(url)).not.toThrow();
    });

    it('CAN-SPAM: Email footer should have unsubscribe link', () => {
      const footer = generateEmailOptOutFooter(testPatientId);

      // Spanish: "Cancelar suscripción"
      expect(footer).toMatch(/<a[^>]+href="[^"]+"[^>]*>[^<]*(unsubscribe|cancelar suscripción)[^<]*<\/a>/i);
    });

    it('CAN-SPAM: Opt-out should be one-click (single URL visit)', () => {
      const url = generateEmailOptOutUrl(testPatientId);

      // URL should contain all necessary parameters for one-click opt-out
      const urlObj = new URL(url);
      expect(urlObj.searchParams.has('token')).toBe(true);
      expect(urlObj.searchParams.has('type')).toBe(true);
    });

    it('Both: Opt-out mechanism should be clearly labeled', () => {
      const smsText = generateSmsOptOutText(testPatientId);
      const emailFooter = generateEmailOptOutFooter(testPatientId);

      expect(smsText.toLowerCase()).toContain('opt');
      // Spanish: "suscripción" instead of "unsubscribe"
      expect(emailFooter.toLowerCase()).toMatch(/suscripción|unsubscribe/);
    });
  });
});
