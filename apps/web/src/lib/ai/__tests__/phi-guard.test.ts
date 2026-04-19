/**
 * Unit tests for phi-guard.ts
 *
 * Coverage:
 * - Positive: each high-confidence pattern throws PhiVetoError with correct name
 * - Negative: clean text passes silently
 * - Edge: empty string, null-like, mixed safe text + one PHI pattern
 *
 * Conservative-by-design: phi-guard does NOT detect names (that's de-id's job).
 * These tests reflect that — names should NOT trigger.
 */

import { assertNoPHI, detectPHI, PhiVetoError } from '../phi-guard';

describe('phi-guard', () => {
  describe('assertNoPHI — positive (must throw)', () => {
    test.each([
      ['BR_CPF', 'Paciente CPF: 123.456.789-00 chegou hoje'],
      ['EMAIL', 'Contact: maria.silva@gmail.com for follow-up'],
      ['AR_DNI', 'DNI: 12.345.678 confirmado'],
      ['MRN_TAG', 'Patient MRN: 84291 admitted'],
      ['MRN_TAG', 'see record MRN#1234567'],
      ['MX_CURP', 'CURP: SILJ820315HDFLPN09 verificado'],
    ])('throws PhiVetoError for %s pattern', (patternName, text) => {
      expect(() => assertNoPHI(text, 'test.callsite')).toThrow(PhiVetoError);
      try {
        assertNoPHI(text, 'test.callsite');
      } catch (e) {
        expect(e).toBeInstanceOf(PhiVetoError);
        expect((e as PhiVetoError).patternName).toBe(patternName);
        expect((e as PhiVetoError).callsite).toBe('test.callsite');
        expect((e as PhiVetoError).message).toContain('CYRUS_VETO');
        // Error must NOT contain the actual matched PHI text
        expect((e as PhiVetoError).message).not.toContain('123.456.789-00');
        expect((e as PhiVetoError).message).not.toContain('maria.silva@gmail.com');
      }
    });
  });

  describe('assertNoPHI — negative (must NOT throw)', () => {
    test.each([
      'paciente refere dor abdominal há 3 dias, sem febre',
      'TA 130/80, FC 78, sat 96% em ar ambiente',
      'plano: solicitar hemograma completo e ecografia abdominal',
      '<PATIENT> presents with symptoms consistent with influenza',
      'ICD-10 code: J11.1 — influenza with respiratory manifestations',
      // Names alone — NOT detected (that's de-id's job, not phi-guard's)
      'João Silva consulted today about chronic back pain',
      'Patient Maria López age 65 diabetes',
      // Year-like 4-digit numbers — too short for MRN tag without prefix
      'admitted in 2024',
      // CPF with no formatting (bare 11 digits) — not high-confidence enough
      'reference number 12345678900',
    ])('does not throw on clean text: %s', (text) => {
      expect(() => assertNoPHI(text, 'test.callsite')).not.toThrow();
    });

    test('empty string is safe', () => {
      expect(() => assertNoPHI('', 'test.callsite')).not.toThrow();
    });
  });

  describe('detectPHI — non-throwing variant', () => {
    test('returns pattern name on hit', () => {
      expect(detectPHI('foo CPF: 111.222.333-44 bar')).toBe('BR_CPF');
      expect(detectPHI('email: x@y.com')).toBe('EMAIL');
    });

    test('returns null on clean text', () => {
      expect(detectPHI('clean text without identifiers')).toBeNull();
      expect(detectPHI('')).toBeNull();
    });
  });

  describe('callsite is preserved in error', () => {
    test('different callsites produce different error context', () => {
      const sites = [
        'recordings.transcribe.soap-prompt',
        'sendToClaude.user-message',
        'summary.generateDraft',
        'ai.forms.generate.user-message',
      ];
      for (const site of sites) {
        try {
          assertNoPHI('email leak: test@example.com', site);
          fail(`Should have thrown for ${site}`);
        } catch (e) {
          expect((e as PhiVetoError).callsite).toBe(site);
          expect((e as PhiVetoError).message).toContain(site);
        }
      }
    });
  });
});
