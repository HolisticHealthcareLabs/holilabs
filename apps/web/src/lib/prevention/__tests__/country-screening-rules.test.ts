import { BRAZIL_SCREENING_RULES } from '../screening-rules-br';
import { COLOMBIA_SCREENING_RULES } from '../screening-rules-co';
import { BOLIVIA_SCREENING_RULES } from '../screening-rules-bo';
import type { ScreeningRule } from '../screening-triggers';

describe('Country-specific screening rules', () => {
  describe('Brazil (BR)', () => {
    it('contains exactly 12 rules', () => {
      expect(BRAZIL_SCREENING_RULES).toHaveLength(12);
    });

    it('all rules have jurisdiction set to BR', () => {
      for (const rule of BRAZIL_SCREENING_RULES) {
        expect(rule.jurisdiction).toBe('BR');
      }
    });

    it('all rules have sourceAuthority populated', () => {
      for (const rule of BRAZIL_SCREENING_RULES) {
        expect(rule.sourceAuthority).toBeTruthy();
      }
    });

    it('has no duplicate screeningType values', () => {
      const types = BRAZIL_SCREENING_RULES.map((r) => r.screeningType);
      expect(new Set(types).size).toBe(types.length);
    });
  });

  describe('Colombia (CO)', () => {
    it('contains exactly 11 rules', () => {
      expect(COLOMBIA_SCREENING_RULES).toHaveLength(11);
    });

    it('all rules have jurisdiction set to CO', () => {
      for (const rule of COLOMBIA_SCREENING_RULES) {
        expect(rule.jurisdiction).toBe('CO');
      }
    });

    it('all rules have sourceAuthority populated', () => {
      for (const rule of COLOMBIA_SCREENING_RULES) {
        expect(rule.sourceAuthority).toBeTruthy();
      }
    });

    it('has no duplicate screeningType values', () => {
      const types = COLOMBIA_SCREENING_RULES.map((r) => r.screeningType);
      expect(new Set(types).size).toBe(types.length);
    });
  });

  describe('Bolivia (BO)', () => {
    it('contains exactly 10 rules', () => {
      expect(BOLIVIA_SCREENING_RULES).toHaveLength(10);
    });

    it('all rules have jurisdiction set to BO', () => {
      for (const rule of BOLIVIA_SCREENING_RULES) {
        expect(rule.jurisdiction).toBe('BO');
      }
    });

    it('all rules have sourceAuthority populated', () => {
      for (const rule of BOLIVIA_SCREENING_RULES) {
        expect(rule.sourceAuthority).toBeTruthy();
      }
    });

    it('has no duplicate screeningType values', () => {
      const types = BOLIVIA_SCREENING_RULES.map((r) => r.screeningType);
      expect(new Set(types).size).toBe(types.length);
    });
  });

  describe('Cross-country invariants', () => {
    const allRules: ScreeningRule[] = [
      ...BRAZIL_SCREENING_RULES,
      ...COLOMBIA_SCREENING_RULES,
      ...BOLIVIA_SCREENING_RULES,
    ];

    it('every rule has a non-empty name', () => {
      for (const rule of allRules) {
        expect(rule.name.length).toBeGreaterThan(0);
      }
    });

    it('every rule has a non-empty clinicalRecommendation', () => {
      for (const rule of allRules) {
        expect(rule.clinicalRecommendation.length).toBeGreaterThan(0);
      }
    });

    it('every rule has a guidelineSource', () => {
      for (const rule of allRules) {
        expect(rule.guidelineSource).toBeTruthy();
      }
    });

    it('every rule has a sourceUrl', () => {
      for (const rule of allRules) {
        expect(rule.sourceUrl).toBeTruthy();
      }
    });

    it('every rule has a lastReviewedDate', () => {
      for (const rule of allRules) {
        expect(rule.lastReviewedDate).toBeTruthy();
      }
    });

    it('frequency.years is a non-negative number on every rule', () => {
      for (const rule of allRules) {
        expect(rule.frequency.years).toBeDefined();
        expect(rule.frequency.years).toBeGreaterThanOrEqual(0);
      }
    });

    it('ageRange.min is a non-negative integer on every rule', () => {
      for (const rule of allRules) {
        expect(Number.isInteger(rule.ageRange.min)).toBe(true);
        expect(rule.ageRange.min).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
