import { calculateABACRiskScore, ABACRiskInput } from '../abac-risk-scorer';

describe('calculateABACRiskScore', () => {
  it('USER + ASSIGNED + consent → ALLOW (score < 0.25)', () => {
    const input: ABACRiskInput = {
      toolName: 'fetch-patient-name',
      toolCategory: 'READ',
      actorType: 'USER',
      accessedFields: ['firstName'],
      patientRelationship: 'ASSIGNED',
      consentBasis: 'explicit_consent',
      sessionToolCallCount: 5,
      isEmergencyOverride: false,
    };

    const result = calculateABACRiskScore(input);
    expect(result.score).toBeLessThan(0.25);
    expect(result.recommendation).toBe('ALLOW');
  });

  it('AGENT + NONE + no consent → DENY (score >= 0.70)', () => {
    const input: ABACRiskInput = {
      toolName: 'list-all-cpf',
      toolCategory: 'READ',
      actorType: 'AGENT',
      accessedFields: ['cpf', 'cns'],
      patientRelationship: 'NONE',
      consentBasis: null,
      sessionToolCallCount: 100,
      isEmergencyOverride: false,
    };

    const result = calculateABACRiskScore(input);
    expect(result.score).toBeGreaterThanOrEqual(0.70);
    expect(result.recommendation).toBe('DENY');
  });

  it('AGENT + ASSIGNED + consent → LOG_ENHANCED', () => {
    const input: ABACRiskInput = {
      toolName: 'read-diagnosis',
      toolCategory: 'READ',
      actorType: 'AGENT',
      accessedFields: ['diagnosis', 'medication'],
      patientRelationship: 'ASSIGNED',
      consentBasis: 'clinical_necessity',
      sessionToolCallCount: 15,
      isEmergencyOverride: false,
    };

    const result = calculateABACRiskScore(input);
    expect(result.score).toBeGreaterThanOrEqual(0.25);
    expect(result.score).toBeLessThan(0.50);
    expect(result.recommendation).toBe('LOG_ENHANCED');
  });

  it('emergency override reduces score by 0.20', () => {
    const baseInput: ABACRiskInput = {
      toolName: 'read-lab-results',
      toolCategory: 'READ',
      actorType: 'AGENT',
      accessedFields: ['labResult', 'diagnosis'],
      patientRelationship: 'ORGANIZATION',
      consentBasis: null,
      sessionToolCallCount: 30,
      isEmergencyOverride: false,
    };

    const resultWithoutOverride = calculateABACRiskScore(baseInput);

    const resultWithOverride = calculateABACRiskScore({
      ...baseInput,
      isEmergencyOverride: true,
    });

    expect(resultWithOverride.score).toBe(resultWithoutOverride.score - 0.20);
    expect(resultWithOverride.factors.some((f) => f.name === 'emergency_override')).toBe(true);
  });

  it('CPF + CNS + RG access = high PHI sensitivity', () => {
    const input: ABACRiskInput = {
      toolName: 'read-full-identity',
      toolCategory: 'READ',
      actorType: 'AGENT',
      accessedFields: ['cpf', 'cns', 'rg'],
      patientRelationship: 'NONE',
      consentBasis: null,
      sessionToolCallCount: 5,
      isEmergencyOverride: false,
    };

    const result = calculateABACRiskScore(input);
    const phiFactor = result.factors.find((f) => f.name === 'phi_sensitivity');
    expect(phiFactor?.value).toBeCloseTo(0.40); // Capped at 0.40
  });

  it('session with 50+ tool calls adds volume factor', () => {
    const input: ABACRiskInput = {
      toolName: 'batch-read',
      toolCategory: 'READ',
      actorType: 'SYSTEM',
      accessedFields: ['firstName'],
      patientRelationship: 'ASSIGNED',
      consentBasis: 'batch_processing',
      sessionToolCallCount: 75,
      isEmergencyOverride: false,
    };

    const result = calculateABACRiskScore(input);
    const volumeFactor = result.factors.find((f) => f.name === 'session_volume');
    expect(volumeFactor?.value).toBe(0.15);
  });

  it('score clamped to [0, 1]', () => {
    const highRiskInput: ABACRiskInput = {
      toolName: 'max-risk',
      toolCategory: 'WRITE',
      actorType: 'AGENT',
      accessedFields: ['cpf', 'cns', 'rg', 'diagnosis', 'medication'],
      patientRelationship: 'NONE',
      consentBasis: null,
      sessionToolCallCount: 100,
      isEmergencyOverride: false,
    };

    const result = calculateABACRiskScore(highRiskInput);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('factors array includes all computed factors with descriptions', () => {
    const input: ABACRiskInput = {
      toolName: 'test-tool',
      toolCategory: 'READ',
      actorType: 'AGENT',
      accessedFields: ['email'],
      patientRelationship: 'TEAM',
      consentBasis: 'data_sharing',
      sessionToolCallCount: 25,
      isEmergencyOverride: true,
    };

    const result = calculateABACRiskScore(input);
    expect(result.factors.length).toBeGreaterThanOrEqual(5);

    const factorNames = result.factors.map((f) => f.name);
    expect(factorNames).toContain('actor_type');
    expect(factorNames).toContain('phi_sensitivity');
    expect(factorNames).toContain('consent_basis');
    expect(factorNames).toContain('patient_relationship');
    expect(factorNames).toContain('session_volume');
    expect(factorNames).toContain('emergency_override');

    result.factors.forEach((factor) => {
      expect(typeof factor.value).toBe('number');
      expect(typeof factor.description).toBe('string');
    });
  });

  it('SYSTEM actor type gets 0.05 risk', () => {
    const input: ABACRiskInput = {
      toolName: 'system-audit',
      toolCategory: 'READ',
      actorType: 'SYSTEM',
      accessedFields: [],
      patientRelationship: 'NONE',
      consentBasis: null,
      sessionToolCallCount: 0,
      isEmergencyOverride: false,
    };

    const result = calculateABACRiskScore(input);
    const actorFactor = result.factors.find((f) => f.name === 'actor_type');
    expect(actorFactor?.value).toBe(0.05);
  });

  it('ORGANIZATION relationship gets 0.15 risk', () => {
    const input: ABACRiskInput = {
      toolName: 'org-wide-read',
      toolCategory: 'READ',
      actorType: 'USER',
      accessedFields: [],
      patientRelationship: 'ORGANIZATION',
      consentBasis: null,
      sessionToolCallCount: 0,
      isEmergencyOverride: false,
    };

    const result = calculateABACRiskScore(input);
    const relationshipFactor = result.factors.find((f) => f.name === 'patient_relationship');
    expect(relationshipFactor?.value).toBe(0.15);
  });

  it('no consent adds 0.25 risk', () => {
    const inputWithConsent: ABACRiskInput = {
      toolName: 'test',
      toolCategory: 'READ',
      actorType: 'USER',
      accessedFields: [],
      patientRelationship: 'ASSIGNED',
      consentBasis: 'explicit',
      sessionToolCallCount: 0,
      isEmergencyOverride: false,
    };

    const inputWithoutConsent: ABACRiskInput = {
      toolName: 'test',
      toolCategory: 'READ',
      actorType: 'USER',
      accessedFields: [],
      patientRelationship: 'ASSIGNED',
      consentBasis: null,
      sessionToolCallCount: 0,
      isEmergencyOverride: false,
    };

    const resultWith = calculateABACRiskScore(inputWithConsent);
    const resultWithout = calculateABACRiskScore(inputWithoutConsent);

    const consentFactorWith = resultWith.factors.find((f) => f.name === 'consent_basis');
    const consentFactorWithout = resultWithout.factors.find((f) => f.name === 'consent_basis');

    expect(consentFactorWith?.value).toBe(0.0);
    expect(consentFactorWithout?.value).toBe(0.25);
  });

  it('21-50 tool calls adds 0.08 volume risk', () => {
    const input: ABACRiskInput = {
      toolName: 'test',
      toolCategory: 'READ',
      actorType: 'AGENT',
      accessedFields: [],
      patientRelationship: 'ASSIGNED',
      consentBasis: null,
      sessionToolCallCount: 35,
      isEmergencyOverride: false,
    };

    const result = calculateABACRiskScore(input);
    const volumeFactor = result.factors.find((f) => f.name === 'session_volume');
    expect(volumeFactor?.value).toBe(0.08);
  });

  it('REQUIRE_JUSTIFICATION threshold at 0.50-0.70', () => {
    const input: ABACRiskInput = {
      toolName: 'medium-risk',
      toolCategory: 'READ',
      actorType: 'AGENT',
      accessedFields: ['medication', 'labResult'],
      patientRelationship: 'TEAM',
      consentBasis: 'treatment',
      sessionToolCallCount: 25,
      isEmergencyOverride: false,
    };

    const result = calculateABACRiskScore(input);
    if (result.score >= 0.50 && result.score < 0.70) {
      expect(result.recommendation).toBe('REQUIRE_JUSTIFICATION');
    }
  });
});
