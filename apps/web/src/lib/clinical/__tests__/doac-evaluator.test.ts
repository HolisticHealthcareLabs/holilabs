import { evaluateDoacSafety } from '../doac-safety-engine';

describe('DOAC Safety Engine', () => {
  // TEST 1: CrCl < 15 blocks rivaroxaban
  test('DOAC-CrCl-001: CrCl < 15 blocks rivaroxaban', () => {
    const result = evaluateDoacSafety({
      currentMedication: 'rivaroxaban',
      creatinineClearance: 12, // ml/min
      age: 78,
      weight: 65
    });

    expect(result.severity).toBe('BLOCK');
    expect(result.rationale).toContain('CrCl < 15 ml/min');
    expect(result.ruleId).toBe('DOAC-CrCl-Rivaroxaban-001');
    expect(result.citationUrl).toMatch(/doi\.org/);
  });

  // TEST 5: Null input handling
  test('DOAC-Null-001: Null CrCl returns ATTESTATION_REQUIRED', () => {
    const result = evaluateDoacSafety({
      currentMedication: 'rivaroxaban',
      creatinineClearance: undefined, // missing data
      age: 65,
      weight: 70
    });

    expect(result.severity).toBe('ATTESTATION_REQUIRED');
    expect(result.missingFields).toContain('creatinineClearance');
  });

  // TEST 6: Edge case — extreme age
  test('DOAC-Age-001: Age 120 does not crash', () => {
    const result = evaluateDoacSafety({
      currentMedication: 'apixaban',
      creatinineClearance: 50,
      age: 120, // edge case
      weight: 50
    });

    // Should be FLAG or PASS depending on exact rules, but not crash
    expect(['BLOCK', 'FLAG', 'PASS', 'ATTESTATION_REQUIRED']).toContain(result.severity);
  });

  // TEST 7: Edge case — extreme weight
  test('DOAC-Weight-001: Weight 30kg triggers FLAG', () => {
    const result = evaluateDoacSafety({
      currentMedication: 'edoxaban', // Edoxaban has weight rule <= 60
      creatinineClearance: 80,
      age: 25,
      weight: 30 // very low weight
    });

    expect(result.severity).toBe('FLAG'); // Should match DOAC-Weight-Edoxaban-001
    expect(result.rationale).toMatch(/weight/i);
  });

  test('DOAC-Interaction: Ketoconazole blocks Rivaroxaban', () => {
    const result = evaluateDoacSafety({
      currentMedication: 'rivaroxaban',
      creatinineClearance: 80,
      age: 60,
      weight: 70,
      interactingMedications: ['ketoconazole']
    });

    expect(result.severity).toBe('BLOCK');
    expect(result.rationale).toContain('Ketoconazole');
  });
});
